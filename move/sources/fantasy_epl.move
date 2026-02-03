module fantasy_epl_addr::fantasy_epl {
    use std::signer;
    use std::vector;
    use std::option::{Self, Option};
    use std::bcs;
    use std::hash;
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_std::table::{Self, Table};
    use aptos_std::simple_map::{Self, SimpleMap};

    // ============ Error Codes ============
    const ENOT_ADMIN: u64 = 1;
    const ENOT_ORACLE: u64 = 2;
    const EGAMEWEEK_NOT_OPEN: u64 = 3;
    const EGAMEWEEK_NOT_CLOSED: u64 = 4;
    const EGAMEWEEK_ALREADY_EXISTS: u64 = 5;
    const EINVALID_TEAM_SIZE: u64 = 6;
    const ETOO_MANY_FROM_SAME_CLUB: u64 = 7;
    const EALREADY_REGISTERED: u64 = 8;
    const EALREADY_HAS_TITLE: u64 = 9;
    const ENO_TITLE_TO_REROLL: u64 = 10;
    const EALREADY_HAS_GUILD: u64 = 11;
    const ENO_GUILD_TO_REROLL: u64 = 12;
    const EINVALID_POSITION_COUNT: u64 = 13;
    const ERESULTS_ALREADY_CALCULATED: u64 = 14;
    const ENO_PRIZE_TO_CLAIM: u64 = 15;
    const EPRIZE_ALREADY_CLAIMED: u64 = 16;
    const EGAMEWEEK_NOT_RESOLVED: u64 = 17;
    const EINVALID_GAMEWEEK: u64 = 18;

    // ============ Constants ============
    // Gameweek status
    const STATUS_OPEN: u8 = 0;
    const STATUS_CLOSED: u8 = 1;
    const STATUS_RESOLVED: u8 = 2;

    // Positions
    const POSITION_GK: u8 = 0;
    const POSITION_DEF: u8 = 1;
    const POSITION_MID: u8 = 2;
    const POSITION_FWD: u8 = 3;

    // Title types (5 total: 2 defensive, 3 attacking)
    const TITLE_TACKLES_MASTER: u8 = 0;      // Defensive
    const TITLE_PENALTY_BOX_WALL: u8 = 1;    // Defensive
    const TITLE_FREE_KICK_SPECIALIST: u8 = 2; // Attacking
    const TITLE_TEAM_STRIKER: u8 = 3;         // Attacking
    const TITLE_DRIBBLE_KING: u8 = 4;         // Attacking

    // Multiplier values (in basis points: 500 = 5%, 1000 = 10%, 1500 = 15%)
    const MULTIPLIER_5: u64 = 500;
    const MULTIPLIER_10: u64 = 1000;
    const MULTIPLIER_15: u64 = 1500;

    // Team composition requirements
    const STARTING_XI_SIZE: u64 = 11;
    const BENCH_SIZE: u64 = 3;
    const TOTAL_SQUAD_SIZE: u64 = 14;
    const MAX_PER_CLUB: u64 = 3;

    // Formation 4-3-3
    const REQUIRED_GK: u64 = 1;
    const REQUIRED_DEF: u64 = 4;
    const REQUIRED_MID: u64 = 3;
    const REQUIRED_FWD: u64 = 3;

    // ============ Structs ============

    /// Global configuration
    struct Config has key {
        admins: vector<address>,  // Multiple admins supported
        oracle: address,
        entry_fee: u64,           // In octas (1 APT = 10^8 octas)
        title_fee: u64,
        guild_fee: u64,
        prize_pool_percent: u64,  // Percentage of fees going to prize pool (e.g., 50 = 50%)
        current_gameweek: u64,
    }

    /// Registry of all gameweeks
    struct GameweekRegistry has key {
        gameweeks: Table<u64, Gameweek>,
    }

    /// Single gameweek data
    struct Gameweek has store {
        id: u64,
        status: u8,
        prize_pool: u64,
        total_entries: u64,
        teams: vector<address>,  // Addresses that registered teams
    }

    /// User's team for a specific gameweek
    struct Team has store, drop, copy {
        owner: address,
        gameweek_id: u64,
        // Player IDs: first 11 are starters (1 GK, 4 DEF, 3 MID, 3 FWD), last 3 are subs
        player_ids: vector<u64>,
        // Position for each player (parallel to player_ids)
        player_positions: vector<u8>,
        // Club ID for each player (for max 3 per club check)
        player_clubs: vector<u64>,
        captain_id: u64,
        created_at: u64,
    }

    /// Storage for user teams per gameweek
    struct UserTeams has key {
        teams: Table<u64, Team>,  // gameweek_id -> Team
    }

    /// User's title (persists for season)
    struct UserTitle has key {
        title_type: u8,
        multiplier: u64,  // In basis points
        season: u64,
    }

    /// User's guild (persists for season)
    struct UserGuild has key {
        multiplier: u64,  // In basis points
        season: u64,
    }

    /// Player stats for a gameweek (submitted by oracle)
    struct PlayerStatsRegistry has key {
        // gameweek_id -> (player_id -> PlayerStats)
        stats: Table<u64, SimpleMap<u64, PlayerStats>>,
    }

    struct PlayerStats has store, drop, copy {
        player_id: u64,
        position: u8,
        minutes_played: u64,
        goals: u64,
        assists: u64,
        clean_sheet: bool,
        saves: u64,
        penalties_saved: u64,
        penalties_missed: u64,
        own_goals: u64,
        yellow_cards: u64,
        red_cards: u64,
        rating: u64,  // Scaled by 10 (e.g., 75 = 7.5 rating)
        // Advanced stats for title conditions
        tackles: u64,
        interceptions: u64,
        successful_dribbles: u64,
        free_kick_goals: u64,
    }

    /// Results for a team in a gameweek
    struct TeamResult has store, drop, copy {
        owner: address,
        base_points: u64,
        rating_bonus: u64,
        rating_bonus_negative: bool,
        title_triggered: bool,
        title_multiplier: u64,
        guild_triggered: bool,
        guild_multiplier: u64,
        final_points: u64,
        rank: u64,
        prize_amount: u64,
        claimed: bool,
    }

    /// Results registry
    struct ResultsRegistry has key {
        // gameweek_id -> (owner -> TeamResult)
        results: Table<u64, SimpleMap<address, TeamResult>>,
    }

    // ============ Events ============

    #[event]
    struct GameweekCreated has drop, store {
        gameweek_id: u64,
        entry_fee: u64,
        created_at: u64,
    }

    #[event]
    struct TeamRegistered has drop, store {
        owner: address,
        gameweek_id: u64,
        player_ids: vector<u64>,
        captain_id: u64,
        entry_fee_paid: u64,
    }

    #[event]
    struct TitleAssigned has drop, store {
        owner: address,
        title_type: u8,
        multiplier: u64,
        is_reroll: bool,
    }

    #[event]
    struct GuildAssigned has drop, store {
        owner: address,
        multiplier: u64,
        is_reroll: bool,
    }

    #[event]
    struct GameweekClosed has drop, store {
        gameweek_id: u64,
        total_entries: u64,
        prize_pool: u64,
    }

    #[event]
    struct ResultsPublished has drop, store {
        gameweek_id: u64,
        total_teams: u64,
    }

    #[event]
    struct PrizeClaimed has drop, store {
        owner: address,
        gameweek_id: u64,
        amount: u64,
        rank: u64,
    }

    // ============ Initialization ============

    fun init_module(sender: &signer) {
        let sender_addr = signer::address_of(sender);

        let admins = vector::empty<address>();
        vector::push_back(&mut admins, sender_addr);

        move_to(sender, Config {
            admins,
            oracle: sender_addr,  // Initially deployer is also oracle
            entry_fee: 100000000,  // 1 APT default
            title_fee: 50000000,   // 0.5 APT
            guild_fee: 50000000,   // 0.5 APT
            prize_pool_percent: 50,
            current_gameweek: 0,
        });

        move_to(sender, GameweekRegistry {
            gameweeks: table::new(),
        });

        move_to(sender, PlayerStatsRegistry {
            stats: table::new(),
        });

        move_to(sender, ResultsRegistry {
            results: table::new(),
        });
    }

    // ============ Admin Functions ============

    /// Check if an address is an admin
    fun is_admin(addr: address, config: &Config): bool {
        vector::contains(&config.admins, &addr)
    }

    /// Create a new gameweek (admin only)
    public entry fun create_gameweek(
        sender: &signer,
        gameweek_id: u64,
    ) acquires Config, GameweekRegistry {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global_mut<Config>(@fantasy_epl_addr);

        assert!(is_admin(sender_addr, config), ENOT_ADMIN);

        let registry = borrow_global_mut<GameweekRegistry>(@fantasy_epl_addr);
        assert!(!table::contains(&registry.gameweeks, gameweek_id), EGAMEWEEK_ALREADY_EXISTS);

        let gameweek = Gameweek {
            id: gameweek_id,
            status: STATUS_OPEN,
            prize_pool: 0,
            total_entries: 0,
            teams: vector::empty(),
        };

        table::add(&mut registry.gameweeks, gameweek_id, gameweek);
        config.current_gameweek = gameweek_id;

        event::emit(GameweekCreated {
            gameweek_id,
            entry_fee: config.entry_fee,
            created_at: timestamp::now_seconds(),
        });
    }

    /// Close registration for a gameweek (admin only)
    public entry fun close_gameweek(
        sender: &signer,
        gameweek_id: u64,
    ) acquires Config, GameweekRegistry {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global<Config>(@fantasy_epl_addr);

        assert!(is_admin(sender_addr, config), ENOT_ADMIN);

        let registry = borrow_global_mut<GameweekRegistry>(@fantasy_epl_addr);
        let gameweek = table::borrow_mut(&mut registry.gameweeks, gameweek_id);

        assert!(gameweek.status == STATUS_OPEN, EGAMEWEEK_NOT_OPEN);
        gameweek.status = STATUS_CLOSED;

        event::emit(GameweekClosed {
            gameweek_id,
            total_entries: gameweek.total_entries,
            prize_pool: gameweek.prize_pool,
        });
    }

    /// Update oracle address (admin only)
    public entry fun set_oracle(
        sender: &signer,
        new_oracle: address,
    ) acquires Config {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global_mut<Config>(@fantasy_epl_addr);

        assert!(is_admin(sender_addr, config), ENOT_ADMIN);
        config.oracle = new_oracle;
    }

    /// Update fees (admin only)
    public entry fun set_fees(
        sender: &signer,
        entry_fee: u64,
        title_fee: u64,
        guild_fee: u64,
    ) acquires Config {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global_mut<Config>(@fantasy_epl_addr);

        assert!(is_admin(sender_addr, config), ENOT_ADMIN);
        config.entry_fee = entry_fee;
        config.title_fee = title_fee;
        config.guild_fee = guild_fee;
    }

    /// Add a new admin (admin only)
    public entry fun add_admin(
        sender: &signer,
        new_admin: address,
    ) acquires Config {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global_mut<Config>(@fantasy_epl_addr);

        assert!(is_admin(sender_addr, config), ENOT_ADMIN);

        // Don't add if already an admin
        if (!vector::contains(&config.admins, &new_admin)) {
            vector::push_back(&mut config.admins, new_admin);
        };
    }

    /// Remove an admin (admin only, cannot remove self if last admin)
    public entry fun remove_admin(
        sender: &signer,
        admin_to_remove: address,
    ) acquires Config {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global_mut<Config>(@fantasy_epl_addr);

        assert!(is_admin(sender_addr, config), ENOT_ADMIN);

        // Must have at least one admin remaining
        assert!(vector::length(&config.admins) > 1, ENOT_ADMIN);

        // Find and remove the admin
        let (found, idx) = vector::index_of(&config.admins, &admin_to_remove);
        if (found) {
            vector::remove(&mut config.admins, idx);
        };
    }

    // ============ User Functions ============

    /// Register a team for a gameweek
    public entry fun register_team(
        sender: &signer,
        gameweek_id: u64,
        player_ids: vector<u64>,
        player_positions: vector<u8>,
        player_clubs: vector<u64>,
        captain_id: u64,
    ) acquires Config, GameweekRegistry, UserTeams {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global<Config>(@fantasy_epl_addr);

        // Validate team size
        assert!(vector::length(&player_ids) == TOTAL_SQUAD_SIZE, EINVALID_TEAM_SIZE);
        assert!(vector::length(&player_positions) == TOTAL_SQUAD_SIZE, EINVALID_TEAM_SIZE);
        assert!(vector::length(&player_clubs) == TOTAL_SQUAD_SIZE, EINVALID_TEAM_SIZE);

        // Validate gameweek is open
        let registry = borrow_global_mut<GameweekRegistry>(@fantasy_epl_addr);
        assert!(table::contains(&registry.gameweeks, gameweek_id), EINVALID_GAMEWEEK);
        let gameweek = table::borrow_mut(&mut registry.gameweeks, gameweek_id);
        assert!(gameweek.status == STATUS_OPEN, EGAMEWEEK_NOT_OPEN);

        // Validate formation (4-3-3) for starting XI
        validate_formation(&player_positions);

        // Validate max 3 per club
        validate_club_limit(&player_clubs);

        // Pay entry fee
        let fee = config.entry_fee;
        coin::transfer<AptosCoin>(sender, @fantasy_epl_addr, fee);

        // Update prize pool
        let prize_contribution = (fee * config.prize_pool_percent) / 100;
        gameweek.prize_pool = gameweek.prize_pool + prize_contribution;
        gameweek.total_entries = gameweek.total_entries + 1;
        vector::push_back(&mut gameweek.teams, sender_addr);

        // Create team
        let team = Team {
            owner: sender_addr,
            gameweek_id,
            player_ids,
            player_positions,
            player_clubs,
            captain_id,
            created_at: timestamp::now_seconds(),
        };

        // Store team
        if (!exists<UserTeams>(sender_addr)) {
            move_to(sender, UserTeams {
                teams: table::new(),
            });
        };

        let user_teams = borrow_global_mut<UserTeams>(sender_addr);
        assert!(!table::contains(&user_teams.teams, gameweek_id), EALREADY_REGISTERED);
        table::add(&mut user_teams.teams, gameweek_id, team);

        event::emit(TeamRegistered {
            owner: sender_addr,
            gameweek_id,
            player_ids,
            captain_id,
            entry_fee_paid: fee,
        });
    }

    /// Buy a title (random assignment)
    public entry fun buy_title(
        sender: &signer,
        season: u64,
    ) acquires Config {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global<Config>(@fantasy_epl_addr);

        // Check doesn't already have title
        assert!(!exists<UserTitle>(sender_addr), EALREADY_HAS_TITLE);

        // Pay fee
        coin::transfer<AptosCoin>(sender, @fantasy_epl_addr, config.title_fee);

        // Generate random title and multiplier
        let (title_type, multiplier) = generate_random_title(sender_addr, option::none());

        move_to(sender, UserTitle {
            title_type,
            multiplier,
            season,
        });

        event::emit(TitleAssigned {
            owner: sender_addr,
            title_type,
            multiplier,
            is_reroll: false,
        });
    }

    /// Reroll title (guaranteed different)
    public entry fun reroll_title(
        sender: &signer,
    ) acquires Config, UserTitle {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global<Config>(@fantasy_epl_addr);

        // Must have existing title
        assert!(exists<UserTitle>(sender_addr), ENO_TITLE_TO_REROLL);

        // Pay fee
        coin::transfer<AptosCoin>(sender, @fantasy_epl_addr, config.title_fee);

        let user_title = borrow_global_mut<UserTitle>(sender_addr);
        let old_title = user_title.title_type;

        // Generate new title (different from old)
        let (new_title_type, new_multiplier) = generate_random_title(sender_addr, option::some(old_title));

        user_title.title_type = new_title_type;
        user_title.multiplier = new_multiplier;

        event::emit(TitleAssigned {
            owner: sender_addr,
            title_type: new_title_type,
            multiplier: new_multiplier,
            is_reroll: true,
        });
    }

    /// Buy a guild
    public entry fun buy_guild(
        sender: &signer,
        season: u64,
    ) acquires Config {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global<Config>(@fantasy_epl_addr);

        assert!(!exists<UserGuild>(sender_addr), EALREADY_HAS_GUILD);

        coin::transfer<AptosCoin>(sender, @fantasy_epl_addr, config.guild_fee);

        let multiplier = generate_random_multiplier(sender_addr, 1);

        move_to(sender, UserGuild {
            multiplier,
            season,
        });

        event::emit(GuildAssigned {
            owner: sender_addr,
            multiplier,
            is_reroll: false,
        });
    }

    /// Reroll guild multiplier
    public entry fun reroll_guild(
        sender: &signer,
    ) acquires Config, UserGuild {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global<Config>(@fantasy_epl_addr);

        assert!(exists<UserGuild>(sender_addr), ENO_GUILD_TO_REROLL);

        coin::transfer<AptosCoin>(sender, @fantasy_epl_addr, config.guild_fee);

        let user_guild = borrow_global_mut<UserGuild>(sender_addr);
        user_guild.multiplier = generate_random_multiplier(sender_addr, 2);

        event::emit(GuildAssigned {
            owner: sender_addr,
            multiplier: user_guild.multiplier,
            is_reroll: true,
        });
    }

    /// Claim prize for a gameweek
    public entry fun claim_prize(
        sender: &signer,
        gameweek_id: u64,
    ) acquires GameweekRegistry, ResultsRegistry {
        let sender_addr = signer::address_of(sender);

        // Check gameweek is resolved
        let registry = borrow_global<GameweekRegistry>(@fantasy_epl_addr);
        let gameweek = table::borrow(&registry.gameweeks, gameweek_id);
        assert!(gameweek.status == STATUS_RESOLVED, EGAMEWEEK_NOT_RESOLVED);

        // Check user has results and prize
        let results_registry = borrow_global_mut<ResultsRegistry>(@fantasy_epl_addr);
        assert!(table::contains(&results_registry.results, gameweek_id), EGAMEWEEK_NOT_RESOLVED);

        let gameweek_results = table::borrow_mut(&mut results_registry.results, gameweek_id);
        assert!(simple_map::contains_key(gameweek_results, &sender_addr), ENO_PRIZE_TO_CLAIM);

        let result = simple_map::borrow_mut(gameweek_results, &sender_addr);
        assert!(!result.claimed, EPRIZE_ALREADY_CLAIMED);
        assert!(result.prize_amount > 0, ENO_PRIZE_TO_CLAIM);

        let amount = result.prize_amount;
        result.claimed = true;

        // Note: Prize transfer is handled off-chain by admin
        // This function just marks the claim and emits event

        event::emit(PrizeClaimed {
            owner: sender_addr,
            gameweek_id,
            amount,
            rank: result.rank,
        });
    }

    // ============ Oracle Functions ============

    /// Submit player stats for a gameweek (oracle only)
    public entry fun submit_player_stats(
        sender: &signer,
        gameweek_id: u64,
        player_ids: vector<u64>,
        positions: vector<u8>,
        minutes_played: vector<u64>,
        goals: vector<u64>,
        assists: vector<u64>,
        clean_sheets: vector<bool>,
        saves: vector<u64>,
        penalties_saved: vector<u64>,
        penalties_missed: vector<u64>,
        own_goals: vector<u64>,
        yellow_cards: vector<u64>,
        red_cards: vector<u64>,
        ratings: vector<u64>,
        tackles: vector<u64>,
        interceptions: vector<u64>,
        successful_dribbles: vector<u64>,
        free_kick_goals: vector<u64>,
    ) acquires Config, GameweekRegistry, PlayerStatsRegistry {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global<Config>(@fantasy_epl_addr);

        assert!(sender_addr == config.oracle, ENOT_ORACLE);

        // Validate gameweek is closed
        let registry = borrow_global<GameweekRegistry>(@fantasy_epl_addr);
        let gameweek = table::borrow(&registry.gameweeks, gameweek_id);
        assert!(gameweek.status == STATUS_CLOSED, EGAMEWEEK_NOT_CLOSED);

        let stats_registry = borrow_global_mut<PlayerStatsRegistry>(@fantasy_epl_addr);

        if (!table::contains(&stats_registry.stats, gameweek_id)) {
            table::add(&mut stats_registry.stats, gameweek_id, simple_map::new());
        };

        let gameweek_stats = table::borrow_mut(&mut stats_registry.stats, gameweek_id);

        let len = vector::length(&player_ids);
        let i = 0;
        while (i < len) {
            let player_id = *vector::borrow(&player_ids, i);
            let stats = PlayerStats {
                player_id,
                position: *vector::borrow(&positions, i),
                minutes_played: *vector::borrow(&minutes_played, i),
                goals: *vector::borrow(&goals, i),
                assists: *vector::borrow(&assists, i),
                clean_sheet: *vector::borrow(&clean_sheets, i),
                saves: *vector::borrow(&saves, i),
                penalties_saved: *vector::borrow(&penalties_saved, i),
                penalties_missed: *vector::borrow(&penalties_missed, i),
                own_goals: *vector::borrow(&own_goals, i),
                yellow_cards: *vector::borrow(&yellow_cards, i),
                red_cards: *vector::borrow(&red_cards, i),
                rating: *vector::borrow(&ratings, i),
                tackles: *vector::borrow(&tackles, i),
                interceptions: *vector::borrow(&interceptions, i),
                successful_dribbles: *vector::borrow(&successful_dribbles, i),
                free_kick_goals: *vector::borrow(&free_kick_goals, i),
            };

            if (simple_map::contains_key(gameweek_stats, &player_id)) {
                let existing = simple_map::borrow_mut(gameweek_stats, &player_id);
                *existing = stats;
            } else {
                simple_map::add(gameweek_stats, player_id, stats);
            };

            i = i + 1;
        };
    }

    /// Calculate and publish results (oracle only)
    public entry fun calculate_results(
        sender: &signer,
        gameweek_id: u64,
        // Title trigger flags per owner (submitted by oracle after checking conditions off-chain)
        title_triggered_owners: vector<address>,
        // Guild trigger flags per owner
        guild_triggered_owners: vector<address>,
        // Prize distribution: top N get prizes
        prize_ranks: vector<u64>,      // Ranks that get prizes (e.g., [1, 2, 3])
        prize_percentages: vector<u64>, // Percentage of pool for each rank (e.g., [50, 30, 20])
    ) acquires Config, GameweekRegistry, UserTeams, PlayerStatsRegistry, ResultsRegistry, UserTitle, UserGuild {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global<Config>(@fantasy_epl_addr);

        assert!(sender_addr == config.oracle, ENOT_ORACLE);

        // Get gameweek
        let registry = borrow_global_mut<GameweekRegistry>(@fantasy_epl_addr);
        let gameweek = table::borrow_mut(&mut registry.gameweeks, gameweek_id);
        assert!(gameweek.status == STATUS_CLOSED, EGAMEWEEK_NOT_CLOSED);

        let results_registry = borrow_global_mut<ResultsRegistry>(@fantasy_epl_addr);
        assert!(!table::contains(&results_registry.results, gameweek_id), ERESULTS_ALREADY_CALCULATED);

        let stats_registry = borrow_global<PlayerStatsRegistry>(@fantasy_epl_addr);
        let gameweek_stats = table::borrow(&stats_registry.stats, gameweek_id);

        // Calculate points for each team
        let team_results: SimpleMap<address, TeamResult> = simple_map::new();
        let points_list: vector<u64> = vector::empty();
        let owners_list: vector<address> = vector::empty();

        let teams = &gameweek.teams;
        let num_teams = vector::length(teams);
        let i = 0;

        while (i < num_teams) {
            let owner = *vector::borrow(teams, i);
            let user_teams = borrow_global<UserTeams>(owner);
            let team = table::borrow(&user_teams.teams, gameweek_id);

            // Calculate base points and rating bonuses
            let (base_points, rating_add, rating_sub) = calculate_team_points(team, gameweek_stats);

            // Calculate net rating bonus
            let rating_bonus: u64;
            let rating_bonus_negative: bool;
            if (rating_add >= rating_sub) {
                rating_bonus = rating_add - rating_sub;
                rating_bonus_negative = false;
            } else {
                rating_bonus = rating_sub - rating_add;
                rating_bonus_negative = true;
            };

            // Check title multiplier
            let title_triggered = vector::contains(&title_triggered_owners, &owner);
            let title_multiplier = if (title_triggered && exists<UserTitle>(owner)) {
                borrow_global<UserTitle>(owner).multiplier
            } else {
                0
            };

            // Check guild multiplier
            let guild_triggered = vector::contains(&guild_triggered_owners, &owner);
            let guild_multiplier = if (guild_triggered && exists<UserGuild>(owner)) {
                borrow_global<UserGuild>(owner).multiplier
            } else {
                0
            };

            // Calculate final points with multipliers
            let pre_multiplier = if (!rating_bonus_negative) {
                base_points + rating_bonus
            } else {
                if (base_points > rating_bonus) { base_points - rating_bonus } else { 0 }
            };

            let total_multiplier = 10000 + title_multiplier + guild_multiplier; // 10000 = 100% base
            let final_points = (pre_multiplier * total_multiplier) / 10000;

            let result = TeamResult {
                owner,
                base_points,
                rating_bonus,
                rating_bonus_negative,
                title_triggered,
                title_multiplier,
                guild_triggered,
                guild_multiplier,
                final_points,
                rank: 0,  // Will be set after sorting
                prize_amount: 0,  // Will be set after ranking
                claimed: false,
            };

            simple_map::add(&mut team_results, owner, result);
            vector::push_back(&mut points_list, final_points);
            vector::push_back(&mut owners_list, owner);

            i = i + 1;
        };

        // Sort and assign ranks (simple bubble sort for MVP)
        let n = vector::length(&points_list);
        let sorted_indices = get_sorted_indices(&points_list);

        // Assign ranks and prizes
        let prize_pool = gameweek.prize_pool;
        i = 0;
        while (i < n) {
            let idx = *vector::borrow(&sorted_indices, i);
            let owner = *vector::borrow(&owners_list, idx);
            let result = simple_map::borrow_mut(&mut team_results, &owner);
            result.rank = i + 1;

            // Check if this rank gets a prize
            let j = 0;
            let num_prize_ranks = vector::length(&prize_ranks);
            while (j < num_prize_ranks) {
                if (*vector::borrow(&prize_ranks, j) == i + 1) {
                    let percentage = *vector::borrow(&prize_percentages, j);
                    result.prize_amount = (prize_pool * percentage) / 100;
                    break
                };
                j = j + 1;
            };

            i = i + 1;
        };

        // Store results
        table::add(&mut results_registry.results, gameweek_id, team_results);

        // Mark gameweek as resolved
        gameweek.status = STATUS_RESOLVED;

        event::emit(ResultsPublished {
            gameweek_id,
            total_teams: num_teams,
        });
    }

    // ============ Helper Functions ============

    fun validate_formation(positions: &vector<u8>) {
        let gk_count: u64 = 0;
        let def_count: u64 = 0;
        let mid_count: u64 = 0;
        let fwd_count: u64 = 0;

        // Count starting XI positions (first 11)
        let i = 0;
        while (i < STARTING_XI_SIZE) {
            let pos = *vector::borrow(positions, i);
            if (pos == POSITION_GK) { gk_count = gk_count + 1; }
            else if (pos == POSITION_DEF) { def_count = def_count + 1; }
            else if (pos == POSITION_MID) { mid_count = mid_count + 1; }
            else if (pos == POSITION_FWD) { fwd_count = fwd_count + 1; };
            i = i + 1;
        };

        assert!(gk_count == REQUIRED_GK, EINVALID_POSITION_COUNT);
        assert!(def_count == REQUIRED_DEF, EINVALID_POSITION_COUNT);
        assert!(mid_count == REQUIRED_MID, EINVALID_POSITION_COUNT);
        assert!(fwd_count == REQUIRED_FWD, EINVALID_POSITION_COUNT);
    }

    fun validate_club_limit(clubs: &vector<u64>) {
        let club_counts: SimpleMap<u64, u64> = simple_map::new();
        let len = vector::length(clubs);
        let i = 0;

        while (i < len) {
            let club = *vector::borrow(clubs, i);
            if (simple_map::contains_key(&club_counts, &club)) {
                let count = simple_map::borrow_mut(&mut club_counts, &club);
                *count = *count + 1;
                assert!(*count <= MAX_PER_CLUB, ETOO_MANY_FROM_SAME_CLUB);
            } else {
                simple_map::add(&mut club_counts, club, 1);
            };
            i = i + 1;
        };
    }

    fun generate_random_title(addr: address, exclude: Option<u8>): (u8, u64) {
        let seed = generate_seed(addr, 0);

        // Generate title type (0-4)
        let title_type = ((seed % 5) as u8);

        // If we need to exclude a title, adjust
        if (option::is_some(&exclude)) {
            let excluded = *option::borrow(&exclude);
            if (title_type == excluded) {
                title_type = (((seed / 5) % 4) as u8);
                if (title_type >= excluded) {
                    title_type = title_type + 1;
                };
            };
        };

        let multiplier = generate_random_multiplier(addr, 0);

        (title_type, multiplier)
    }

    // Generate a pseudo-random seed from address and salt
    fun generate_seed(addr: address, salt: u64): u64 {
        let bytes = bcs::to_bytes(&addr);
        vector::append(&mut bytes, bcs::to_bytes(&timestamp::now_microseconds()));
        vector::append(&mut bytes, bcs::to_bytes(&salt));
        let hash_bytes = hash::sha3_256(bytes);
        // Take first 8 bytes as u64
        let seed: u64 = 0;
        let i = 0;
        while (i < 8) {
            seed = (seed << 8) | (*vector::borrow(&hash_bytes, i) as u64);
            i = i + 1;
        };
        seed
    }

    fun generate_random_multiplier(addr: address, salt: u64): u64 {
        let seed = generate_seed(addr, salt + 1000); // Different salt to avoid correlation with title
        let rand = seed % 3;

        if (rand == 0) { MULTIPLIER_5 }
        else if (rand == 1) { MULTIPLIER_10 }
        else { MULTIPLIER_15 }
    }

    // Returns (base_points, rating_bonus_positive, rating_bonus_negative)
    fun calculate_team_points(team: &Team, stats: &SimpleMap<u64, PlayerStats>): (u64, u64, u64) {
        let total_base: u64 = 0;
        let total_rating_add: u64 = 0;
        let total_rating_sub: u64 = 0;

        // Calculate points for starting XI (first 11 players)
        let i = 0;
        while (i < STARTING_XI_SIZE) {
            let player_id = *vector::borrow(&team.player_ids, i);
            let position = *vector::borrow(&team.player_positions, i);

            if (simple_map::contains_key(stats, &player_id)) {
                let player_stats = simple_map::borrow(stats, &player_id);

                // Check if player played, if not try substitute
                if (player_stats.minutes_played == 0) {
                    // Find substitute of same position
                    let sub_idx = find_substitute(team, position, stats, i);
                    if (sub_idx < TOTAL_SQUAD_SIZE) {
                        let sub_id = *vector::borrow(&team.player_ids, sub_idx);
                        if (simple_map::contains_key(stats, &sub_id)) {
                            let sub_stats = simple_map::borrow(stats, &sub_id);
                            let (base, rating_add, rating_sub) = calculate_player_points(sub_stats, position);
                            total_base = total_base + base;
                            total_rating_add = total_rating_add + rating_add;
                            total_rating_sub = total_rating_sub + rating_sub;
                        };
                    };
                } else {
                    let (base, rating_add, rating_sub) = calculate_player_points(player_stats, position);

                    // Double points for captain
                    if (player_id == team.captain_id) {
                        total_base = total_base + base * 2;
                        total_rating_add = total_rating_add + rating_add * 2;
                        total_rating_sub = total_rating_sub + rating_sub * 2;
                    } else {
                        total_base = total_base + base;
                        total_rating_add = total_rating_add + rating_add;
                        total_rating_sub = total_rating_sub + rating_sub;
                    };
                };
            };

            i = i + 1;
        };

        (total_base, total_rating_add, total_rating_sub)
    }

    fun find_substitute(team: &Team, position: u8, stats: &SimpleMap<u64, PlayerStats>, _starter_idx: u64): u64 {
        // Look through bench (indices 11, 12, 13)
        let i = STARTING_XI_SIZE;
        while (i < TOTAL_SQUAD_SIZE) {
            let sub_position = *vector::borrow(&team.player_positions, i);
            if (sub_position == position) {
                let sub_id = *vector::borrow(&team.player_ids, i);
                if (simple_map::contains_key(stats, &sub_id)) {
                    let sub_stats = simple_map::borrow(stats, &sub_id);
                    if (sub_stats.minutes_played > 0) {
                        return i
                    };
                };
            };
            i = i + 1;
        };
        TOTAL_SQUAD_SIZE // No valid substitute found
    }

    // Returns (base_points, rating_add, rating_sub)
    fun calculate_player_points(stats: &PlayerStats, position: u8): (u64, u64, u64) {
        let points: u64 = 0;

        // Minutes played
        if (stats.minutes_played > 0) {
            points = points + 1;
            if (stats.minutes_played >= 60) {
                points = points + 1;
            };
        };

        // Goals
        if (stats.goals > 0) {
            let goal_points = if (position == POSITION_FWD) { 4 }
                else if (position == POSITION_MID) { 5 }
                else { 6 }; // DEF or GK
            points = points + (stats.goals * goal_points);
        };

        // Assists
        points = points + (stats.assists * 3);

        // Clean sheet (GK/DEF only, 60+ minutes)
        if (stats.clean_sheet && stats.minutes_played >= 60 && (position == POSITION_GK || position == POSITION_DEF)) {
            points = points + 4;
        };

        // GK saves
        if (position == POSITION_GK) {
            points = points + (stats.saves / 3);
        };

        // Penalties
        points = points + (stats.penalties_saved * 5);

        // Deductions
        let deductions: u64 = 0;
        deductions = deductions + (stats.penalties_missed * 2);
        deductions = deductions + (stats.own_goals * 2);
        deductions = deductions + stats.yellow_cards;
        deductions = deductions + (stats.red_cards * 3);

        if (points > deductions) {
            points = points - deductions;
        } else {
            points = 0;
        };

        // Rating bonus (positive) and penalty (negative)
        let rating_add: u64 = if (stats.rating >= 90) { 3 }
            else if (stats.rating >= 80) { 2 }
            else if (stats.rating >= 75) { 1 }
            else { 0 };

        let rating_sub: u64 = if (stats.rating < 60 && stats.minutes_played > 0) { 1 } else { 0 };

        (points, rating_add, rating_sub)
    }

    fun get_sorted_indices(points: &vector<u64>): vector<u64> {
        let n = vector::length(points);
        let indices: vector<u64> = vector::empty();

        // Initialize indices
        let i = 0;
        while (i < n) {
            vector::push_back(&mut indices, i);
            i = i + 1;
        };

        // Bubble sort by points (descending)
        i = 0;
        while (i < n) {
            let j = 0;
            while (j < n - i - 1) {
                let idx_j = *vector::borrow(&indices, j);
                let idx_j1 = *vector::borrow(&indices, j + 1);
                let points_j = *vector::borrow(points, idx_j);
                let points_j1 = *vector::borrow(points, idx_j1);

                if (points_j < points_j1) {
                    // Swap
                    *vector::borrow_mut(&mut indices, j) = idx_j1;
                    *vector::borrow_mut(&mut indices, j + 1) = idx_j;
                };
                j = j + 1;
            };
            i = i + 1;
        };

        indices
    }

    // ============ View Functions ============

    #[view]
    public fun get_config(): (vector<address>, address, u64, u64, u64, u64, u64) acquires Config {
        let config = borrow_global<Config>(@fantasy_epl_addr);
        (
            config.admins,
            config.oracle,
            config.entry_fee,
            config.title_fee,
            config.guild_fee,
            config.prize_pool_percent,
            config.current_gameweek,
        )
    }

    #[view]
    public fun get_gameweek(gameweek_id: u64): (u64, u8, u64, u64) acquires GameweekRegistry {
        let registry = borrow_global<GameweekRegistry>(@fantasy_epl_addr);
        let gameweek = table::borrow(&registry.gameweeks, gameweek_id);
        (gameweek.id, gameweek.status, gameweek.prize_pool, gameweek.total_entries)
    }

    #[view]
    public fun get_user_team(owner: address, gameweek_id: u64): (vector<u64>, vector<u8>, u64) acquires UserTeams {
        let user_teams = borrow_global<UserTeams>(owner);
        let team = table::borrow(&user_teams.teams, gameweek_id);
        (team.player_ids, team.player_positions, team.captain_id)
    }

    #[view]
    public fun get_user_title(owner: address): (u8, u64, u64) acquires UserTitle {
        let title = borrow_global<UserTitle>(owner);
        (title.title_type, title.multiplier, title.season)
    }

    #[view]
    public fun get_user_guild(owner: address): (u64, u64) acquires UserGuild {
        let guild = borrow_global<UserGuild>(owner);
        (guild.multiplier, guild.season)
    }

    #[view]
    public fun get_team_result(owner: address, gameweek_id: u64): (u64, u64, bool, bool, u64, bool, u64, u64, u64, u64, bool) acquires ResultsRegistry {
        let registry = borrow_global<ResultsRegistry>(@fantasy_epl_addr);
        let gameweek_results = table::borrow(&registry.results, gameweek_id);
        let result = simple_map::borrow(gameweek_results, &owner);
        (
            result.base_points,
            result.rating_bonus,
            result.rating_bonus_negative,
            result.title_triggered,
            result.title_multiplier,
            result.guild_triggered,
            result.guild_multiplier,
            result.final_points,
            result.rank,
            result.prize_amount,
            result.claimed,
        )
    }

    #[view]
    public fun has_title(owner: address): bool {
        exists<UserTitle>(owner)
    }

    #[view]
    public fun has_guild(owner: address): bool {
        exists<UserGuild>(owner)
    }

    #[view]
    public fun has_registered_team(owner: address, gameweek_id: u64): bool acquires UserTeams {
        if (!exists<UserTeams>(owner)) {
            return false
        };
        let user_teams = borrow_global<UserTeams>(owner);
        table::contains(&user_teams.teams, gameweek_id)
    }

    #[view]
    /// Get all admin addresses
    public fun get_admins(): vector<address> acquires Config {
        let config = borrow_global<Config>(@fantasy_epl_addr);
        config.admins
    }

    #[view]
    /// Check if an address is an admin
    public fun is_admin_address(addr: address): bool acquires Config {
        let config = borrow_global<Config>(@fantasy_epl_addr);
        vector::contains(&config.admins, &addr)
    }

    #[view]
    /// Get oracle address
    public fun get_oracle(): address acquires Config {
        let config = borrow_global<Config>(@fantasy_epl_addr);
        config.oracle
    }

    #[view]
    /// Check if a gameweek exists
    public fun gameweek_exists(gameweek_id: u64): bool acquires GameweekRegistry {
        let registry = borrow_global<GameweekRegistry>(@fantasy_epl_addr);
        table::contains(&registry.gameweeks, gameweek_id)
    }

    #[view]
    /// Get list of teams registered for a gameweek
    public fun get_gameweek_teams(gameweek_id: u64): vector<address> acquires GameweekRegistry {
        let registry = borrow_global<GameweekRegistry>(@fantasy_epl_addr);
        let gameweek = table::borrow(&registry.gameweeks, gameweek_id);
        gameweek.teams
    }

    #[view]
    /// Get player stats for a specific player in a gameweek
    public fun get_player_stats(gameweek_id: u64, player_id: u64): (u8, u64, u64, u64, bool, u64, u64, u64, u64, u64, u64, u64) acquires PlayerStatsRegistry {
        let registry = borrow_global<PlayerStatsRegistry>(@fantasy_epl_addr);
        let gameweek_stats = table::borrow(&registry.stats, gameweek_id);
        let stats = simple_map::borrow(gameweek_stats, &player_id);
        (
            stats.position,
            stats.minutes_played,
            stats.goals,
            stats.assists,
            stats.clean_sheet,
            stats.saves,
            stats.penalties_saved,
            stats.penalties_missed,
            stats.own_goals,
            stats.yellow_cards,
            stats.red_cards,
            stats.rating,
        )
    }

    #[view]
    /// Check if player stats exist for a gameweek
    public fun player_stats_exist(gameweek_id: u64, player_id: u64): bool acquires PlayerStatsRegistry {
        let registry = borrow_global<PlayerStatsRegistry>(@fantasy_epl_addr);
        if (!table::contains(&registry.stats, gameweek_id)) {
            return false
        };
        let gameweek_stats = table::borrow(&registry.stats, gameweek_id);
        simple_map::contains_key(gameweek_stats, &player_id)
    }

    #[view]
    /// Get entry fee
    public fun get_entry_fee(): u64 acquires Config {
        let config = borrow_global<Config>(@fantasy_epl_addr);
        config.entry_fee
    }

    #[view]
    /// Get title fee
    public fun get_title_fee(): u64 acquires Config {
        let config = borrow_global<Config>(@fantasy_epl_addr);
        config.title_fee
    }

    #[view]
    /// Get guild fee
    public fun get_guild_fee(): u64 acquires Config {
        let config = borrow_global<Config>(@fantasy_epl_addr);
        config.guild_fee
    }

    #[view]
    /// Get current gameweek number
    public fun get_current_gameweek(): u64 acquires Config {
        let config = borrow_global<Config>(@fantasy_epl_addr);
        config.current_gameweek
    }

    // ============ Tests ============

    #[test_only]
    use aptos_framework::aptos_coin;
    #[test_only]
    use aptos_framework::account;

    #[test_only]
    fun setup_test(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) {
        // Initialize timestamp for testing
        timestamp::set_time_has_started_for_testing(aptos_framework);
        timestamp::update_global_time_for_test_secs(1000);

        // Create accounts
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user1));
        account::create_account_for_test(signer::address_of(user2));

        // Initialize AptosCoin and mint to accounts
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(aptos_framework);

        // Register and mint coins
        coin::register<AptosCoin>(admin);
        coin::register<AptosCoin>(user1);
        coin::register<AptosCoin>(user2);

        let coins_admin = coin::mint<AptosCoin>(1000_00000000, &mint_cap); // 1000 APT
        let coins_user1 = coin::mint<AptosCoin>(100_00000000, &mint_cap);  // 100 APT
        let coins_user2 = coin::mint<AptosCoin>(100_00000000, &mint_cap);  // 100 APT

        coin::deposit(signer::address_of(admin), coins_admin);
        coin::deposit(signer::address_of(user1), coins_user1);
        coin::deposit(signer::address_of(user2), coins_user2);

        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);

        // Initialize the module
        init_module(admin);
    }

    #[test_only]
    fun create_test_team_data(): (vector<u64>, vector<u8>, vector<u64>) {
        // Create valid 4-3-3 formation: 1 GK, 4 DEF, 3 MID, 3 FWD + 3 subs
        let player_ids = vector[
            1, // GK
            2, 3, 4, 5, // DEF
            6, 7, 8, // MID
            9, 10, 11, // FWD
            12, 13, 14 // Subs (DEF, MID, FWD)
        ];

        let positions = vector[
            0, // GK
            1, 1, 1, 1, // DEF
            2, 2, 2, // MID
            3, 3, 3, // FWD
            1, 2, 3 // Subs
        ];

        // Different clubs to satisfy max 3 per club rule
        let clubs = vector[
            1, // GK - club 1
            1, 2, 2, 3, // DEF - clubs 1,2,2,3
            3, 4, 4, // MID - clubs 3,4,4
            5, 5, 6, // FWD - clubs 5,5,6
            6, 7, 7 // Subs - clubs 6,7,7
        ];

        (player_ids, positions, clubs)
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    fun test_init_module(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) acquires Config {
        setup_test(aptos_framework, admin, user1, user2);

        // Verify config was initialized
        let (admins, oracle_addr, entry_fee, title_fee, guild_fee, prize_percent, current_gw) = get_config();

        assert!(vector::length(&admins) == 1, 1);
        assert!(*vector::borrow(&admins, 0) == @fantasy_epl_addr, 2);
        assert!(oracle_addr == @fantasy_epl_addr, 3);
        assert!(entry_fee == 100000000, 4); // 1 APT
        assert!(title_fee == 50000000, 5);  // 0.5 APT
        assert!(guild_fee == 50000000, 6);  // 0.5 APT
        assert!(prize_percent == 50, 7);
        assert!(current_gw == 0, 8);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    fun test_create_gameweek(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) acquires Config, GameweekRegistry {
        setup_test(aptos_framework, admin, user1, user2);

        // Create gameweek 1
        create_gameweek(admin, 1);

        // Verify gameweek was created
        let (id, status, prize_pool, total_entries) = get_gameweek(1);
        assert!(id == 1, 1);
        assert!(status == STATUS_OPEN, 2);
        assert!(prize_pool == 0, 3);
        assert!(total_entries == 0, 4);

        // Verify current gameweek updated
        let (_, _, _, _, _, _, current_gw) = get_config();
        assert!(current_gw == 1, 5);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    #[expected_failure(abort_code = ENOT_ADMIN)]
    fun test_create_gameweek_not_admin(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) acquires Config, GameweekRegistry {
        setup_test(aptos_framework, admin, user1, user2);

        // Non-admin tries to create gameweek - should fail
        create_gameweek(user1, 1);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    fun test_register_team(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) acquires Config, GameweekRegistry, UserTeams {
        setup_test(aptos_framework, admin, user1, user2);

        // Create gameweek
        create_gameweek(admin, 1);

        // Get test team data
        let (player_ids, positions, clubs) = create_test_team_data();

        // Register team
        register_team(user1, 1, player_ids, positions, clubs, 9); // Captain is player 9

        // Verify team was registered
        assert!(has_registered_team(@0x123, 1), 1);

        // Verify gameweek updated
        let (_, _, prize_pool, total_entries) = get_gameweek(1);
        assert!(total_entries == 1, 2);
        assert!(prize_pool == 50000000, 3); // 50% of 1 APT entry fee

        // Verify user's team data
        let (ids, pos, captain) = get_user_team(@0x123, 1);
        assert!(vector::length(&ids) == 14, 4);
        assert!(vector::length(&pos) == 14, 5);
        assert!(captain == 9, 6);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    #[expected_failure(abort_code = EGAMEWEEK_NOT_OPEN)]
    fun test_register_team_gameweek_closed(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) acquires Config, GameweekRegistry, UserTeams {
        setup_test(aptos_framework, admin, user1, user2);

        // Create and close gameweek
        create_gameweek(admin, 1);
        close_gameweek(admin, 1);

        // Try to register - should fail
        let (player_ids, positions, clubs) = create_test_team_data();
        register_team(user1, 1, player_ids, positions, clubs, 9);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    #[expected_failure(abort_code = ETOO_MANY_FROM_SAME_CLUB)]
    fun test_register_team_too_many_same_club(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) acquires Config, GameweekRegistry, UserTeams {
        setup_test(aptos_framework, admin, user1, user2);

        create_gameweek(admin, 1);

        // Create invalid team with 4 players from same club
        let player_ids = vector[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
        let positions = vector[0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 1, 2, 3];
        let clubs = vector[1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]; // 4 from club 1 - invalid!

        register_team(user1, 1, player_ids, positions, clubs, 9);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    #[expected_failure(abort_code = EINVALID_POSITION_COUNT)]
    fun test_register_team_invalid_formation(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) acquires Config, GameweekRegistry, UserTeams {
        setup_test(aptos_framework, admin, user1, user2);

        create_gameweek(admin, 1);

        // Create invalid formation (5 DEF instead of 4)
        let player_ids = vector[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
        let positions = vector[0, 1, 1, 1, 1, 1, 2, 2, 3, 3, 3, 1, 2, 3]; // 5 DEF - invalid!
        let clubs = vector[1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7];

        register_team(user1, 1, player_ids, positions, clubs, 9);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    fun test_buy_title(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) acquires Config, UserTitle {
        setup_test(aptos_framework, admin, user1, user2);

        // User buys title
        buy_title(user1, 1);

        // Verify title was assigned
        assert!(has_title(@0x123), 1);

        let (title_type, multiplier, season) = get_user_title(@0x123);
        assert!(title_type <= 4, 2); // Valid title type (0-4)
        assert!(multiplier == 500 || multiplier == 1000 || multiplier == 1500, 3); // Valid multiplier
        assert!(season == 1, 4);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    #[expected_failure(abort_code = EALREADY_HAS_TITLE)]
    fun test_buy_title_already_has(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) acquires Config {
        setup_test(aptos_framework, admin, user1, user2);

        buy_title(user1, 1);
        buy_title(user1, 1); // Should fail - already has title
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    fun test_reroll_title(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) acquires Config, UserTitle {
        setup_test(aptos_framework, admin, user1, user2);

        buy_title(user1, 1);
        let (old_type, _, _) = get_user_title(@0x123);

        // Advance time to get different random result
        timestamp::update_global_time_for_test_secs(2000);

        reroll_title(user1);
        let (new_type, new_multiplier, _) = get_user_title(@0x123);

        // New title should be different (guaranteed by contract logic)
        assert!(new_type != old_type, 1);
        assert!(new_multiplier == 500 || new_multiplier == 1000 || new_multiplier == 1500, 2);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    fun test_buy_guild(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) acquires Config, UserGuild {
        setup_test(aptos_framework, admin, user1, user2);

        buy_guild(user1, 1);

        assert!(has_guild(@0x123), 1);

        let (multiplier, season) = get_user_guild(@0x123);
        assert!(multiplier == 500 || multiplier == 1000 || multiplier == 1500, 2);
        assert!(season == 1, 3);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    fun test_close_gameweek(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) acquires Config, GameweekRegistry {
        setup_test(aptos_framework, admin, user1, user2);

        create_gameweek(admin, 1);
        close_gameweek(admin, 1);

        let (_, status, _, _) = get_gameweek(1);
        assert!(status == STATUS_CLOSED, 1);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    fun test_submit_player_stats(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) acquires Config, GameweekRegistry, PlayerStatsRegistry {
        setup_test(aptos_framework, admin, user1, user2);

        create_gameweek(admin, 1);
        close_gameweek(admin, 1);

        // Submit stats for a few players
        let player_ids = vector[1, 9];
        let positions = vector[0, 3]; // GK and FWD
        let minutes = vector[90, 90];
        let goals = vector[0, 2];
        let assists = vector[0, 1];
        let clean_sheets = vector[true, false];
        let saves = vector[5, 0];
        let pen_saved = vector[1, 0];
        let pen_missed = vector[0, 0];
        let own_goals = vector[0, 0];
        let yellows = vector[0, 1];
        let reds = vector[0, 0];
        let ratings = vector[85, 92]; // 8.5 and 9.2
        let tackles = vector[0, 2];
        let interceptions = vector[1, 0];
        let dribbles = vector[0, 5];
        let fk_goals = vector[0, 1];

        submit_player_stats(
            admin, 1,
            player_ids, positions, minutes, goals, assists,
            clean_sheets, saves, pen_saved, pen_missed,
            own_goals, yellows, reds, ratings,
            tackles, interceptions, dribbles, fk_goals
        );

        // Stats submitted successfully (no error)
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    fun test_full_gameweek_flow(
        aptos_framework: &signer,
        admin: &signer,
        user1: &signer,
        user2: &signer
    ) acquires Config, GameweekRegistry, UserTeams, PlayerStatsRegistry, ResultsRegistry, UserTitle, UserGuild {
        setup_test(aptos_framework, admin, user1, user2);

        // 1. Create gameweek
        create_gameweek(admin, 1);

        // 2. Users register teams
        let (player_ids, positions, clubs) = create_test_team_data();
        register_team(user1, 1, player_ids, positions, clubs, 9);

        // User2 registers with slightly different team
        let player_ids2 = vector[1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 9, 12, 13, 14];
        register_team(user2, 1, player_ids2, positions, clubs, 10);

        // 3. Users buy titles
        buy_title(user1, 1);
        timestamp::update_global_time_for_test_secs(1500);
        buy_title(user2, 1);

        // 4. Close gameweek
        close_gameweek(admin, 1);

        // Verify prize pool
        let (_, _, prize_pool, total_entries) = get_gameweek(1);
        assert!(total_entries == 2, 1);
        assert!(prize_pool == 100000000, 2); // 2 entries * 50% of 1 APT

        // 5. Submit player stats
        // Player 9 scored 2 goals, player 10 scored 1
        let all_player_ids = vector[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
        let all_positions = vector[0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 1, 2, 3];
        let all_minutes = vector[90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 0, 0, 0];
        let all_goals = vector[0, 0, 0, 0, 0, 0, 1, 0, 2, 1, 0, 0, 0, 0];
        let all_assists = vector[0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0];
        let all_clean = vector[true, true, true, true, true, false, false, false, false, false, false, false, false, false];
        let all_saves = vector[4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        let all_pen_saved = vector[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        let all_pen_missed = vector[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        let all_own_goals = vector[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        let all_yellows = vector[0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        let all_reds = vector[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        let all_ratings = vector[75, 72, 68, 71, 70, 78, 82, 76, 91, 80, 74, 0, 0, 0];
        let all_tackles = vector[0, 3, 5, 4, 2, 2, 1, 3, 0, 0, 1, 0, 0, 0];
        let all_inter = vector[1, 2, 3, 2, 1, 1, 0, 2, 0, 0, 0, 0, 0, 0];
        let all_dribbles = vector[0, 0, 0, 0, 1, 2, 4, 2, 6, 3, 2, 0, 0, 0];
        let all_fk_goals = vector[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        submit_player_stats(
            admin, 1,
            all_player_ids, all_positions, all_minutes, all_goals, all_assists,
            all_clean, all_saves, all_pen_saved, all_pen_missed,
            all_own_goals, all_yellows, all_reds, all_ratings,
            all_tackles, all_inter, all_dribbles, all_fk_goals
        );

        // 6. Calculate results
        // User1's captain is player 9 (2 goals, rating 9.1 -> +3 bonus, doubled for captain)
        // User2's captain is player 10 (1 goal, rating 8.0 -> +2 bonus, doubled)
        calculate_results(
            admin, 1,
            vector[], // No title triggers for simplicity
            vector[], // No guild triggers
            vector[1, 2], // Prize ranks
            vector[60, 40]  // Prize percentages
        );

        // Verify gameweek resolved
        let (_, status, _, _) = get_gameweek(1);
        assert!(status == STATUS_RESOLVED, 3);

        // Check results
        let (_, _, _, _, _, _, _, _, rank1, prize1, claimed1) = get_team_result(@0x123, 1);
        let (_, _, _, _, _, _, _, _, rank2, prize2, claimed2) = get_team_result(@0x456, 1);

        // User1 should have higher score (captain scored more)
        assert!(!claimed1 && !claimed2, 4);
        assert!(rank1 == 1 || rank2 == 1, 5); // Someone is rank 1
        assert!(prize1 > 0 || prize2 > 0, 6); // Someone has prize
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    fun test_claim_prize(
        aptos_framework: &signer,
        admin: &signer,
        user1: &signer,
        user2: &signer
    ) acquires Config, GameweekRegistry, UserTeams, PlayerStatsRegistry, ResultsRegistry, UserTitle, UserGuild {
        setup_test(aptos_framework, admin, user1, user2);

        // Setup a complete gameweek
        create_gameweek(admin, 1);
        let (player_ids, positions, clubs) = create_test_team_data();
        register_team(user1, 1, player_ids, positions, clubs, 9);
        close_gameweek(admin, 1);

        // Submit minimal stats
        submit_player_stats(
            admin, 1,
            vector[1, 9],
            vector[0, 3],
            vector[90, 90],
            vector[0, 1],
            vector[0, 0],
            vector[true, false],
            vector[3, 0],
            vector[0, 0],
            vector[0, 0],
            vector[0, 0],
            vector[0, 0],
            vector[0, 0],
            vector[75, 80],
            vector[0, 0],
            vector[0, 0],
            vector[0, 0],
            vector[0, 0]
        );

        // Calculate results with user1 as winner
        calculate_results(
            admin, 1,
            vector[],
            vector[],
            vector[1],
            vector[100]
        );

        // Claim prize
        claim_prize(user1, 1);

        // Verify claimed
        let (_, _, _, _, _, _, _, _, _, _, claimed) = get_team_result(@0x123, 1);
        assert!(claimed, 1);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    #[expected_failure(abort_code = EPRIZE_ALREADY_CLAIMED)]
    fun test_claim_prize_twice(
        aptos_framework: &signer,
        admin: &signer,
        user1: &signer,
        user2: &signer
    ) acquires Config, GameweekRegistry, UserTeams, PlayerStatsRegistry, ResultsRegistry, UserTitle, UserGuild {
        setup_test(aptos_framework, admin, user1, user2);

        create_gameweek(admin, 1);
        let (player_ids, positions, clubs) = create_test_team_data();
        register_team(user1, 1, player_ids, positions, clubs, 9);
        close_gameweek(admin, 1);

        submit_player_stats(
            admin, 1,
            vector[9], vector[3], vector[90], vector[1], vector[0],
            vector[false], vector[0], vector[0], vector[0],
            vector[0], vector[0], vector[0], vector[80],
            vector[0], vector[0], vector[0], vector[0]
        );

        calculate_results(admin, 1, vector[], vector[], vector[1], vector[100]);

        claim_prize(user1, 1);
        claim_prize(user1, 1); // Should fail
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    fun test_set_oracle(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) acquires Config {
        setup_test(aptos_framework, admin, user1, user2);

        set_oracle(admin, @0x123);

        let oracle = get_oracle();
        assert!(oracle == @0x123, 1);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    fun test_add_admin(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) acquires Config {
        setup_test(aptos_framework, admin, user1, user2);

        // Add user1 as admin
        add_admin(admin, @0x123);

        // Verify user1 is now admin
        assert!(is_admin_address(@0x123), 1);

        // Verify there are now 2 admins
        let admins = get_admins();
        assert!(vector::length(&admins) == 2, 2);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    fun test_remove_admin(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) acquires Config {
        setup_test(aptos_framework, admin, user1, user2);

        // Add user1 as admin first
        add_admin(admin, @0x123);
        assert!(is_admin_address(@0x123), 1);

        // Remove user1
        remove_admin(admin, @0x123);
        assert!(!is_admin_address(@0x123), 2);

        // Verify back to 1 admin
        let admins = get_admins();
        assert!(vector::length(&admins) == 1, 3);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    #[expected_failure(abort_code = ENOT_ADMIN)]
    fun test_add_admin_not_admin(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) acquires Config {
        setup_test(aptos_framework, admin, user1, user2);

        // Non-admin tries to add admin - should fail
        add_admin(user1, @0x456);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    #[expected_failure(abort_code = ENOT_ADMIN)]
    fun test_remove_last_admin(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) acquires Config {
        setup_test(aptos_framework, admin, user1, user2);

        // Try to remove the only admin - should fail
        remove_admin(admin, @fantasy_epl_addr);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    fun test_set_fees(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) acquires Config {
        setup_test(aptos_framework, admin, user1, user2);

        set_fees(admin, 200000000, 100000000, 75000000);

        let entry_fee = get_entry_fee();
        let title_fee = get_title_fee();
        let guild_fee = get_guild_fee();
        assert!(entry_fee == 200000000, 1);
        assert!(title_fee == 100000000, 2);
        assert!(guild_fee == 75000000, 3);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    fun test_calculate_player_points_forward_goal(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) {
        setup_test(aptos_framework, admin, user1, user2);

        let stats = PlayerStats {
            player_id: 1,
            position: POSITION_FWD,
            minutes_played: 90,
            goals: 2,
            assists: 1,
            clean_sheet: false,
            saves: 0,
            penalties_saved: 0,
            penalties_missed: 0,
            own_goals: 0,
            yellow_cards: 0,
            red_cards: 0,
            rating: 85,
            tackles: 0,
            interceptions: 0,
            successful_dribbles: 0,
            free_kick_goals: 0,
        };

        let (base, add, sub) = calculate_player_points(&stats, POSITION_FWD);

        // 2 (minutes) + 8 (2 goals * 4) + 3 (1 assist) = 13
        assert!(base == 13, 1);
        // Rating 8.5 -> +2 bonus
        assert!(add == 2, 2);
        assert!(sub == 0, 3);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    fun test_calculate_player_points_goalkeeper_clean_sheet(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) {
        setup_test(aptos_framework, admin, user1, user2);

        let stats = PlayerStats {
            player_id: 1,
            position: POSITION_GK,
            minutes_played: 90,
            goals: 0,
            assists: 0,
            clean_sheet: true,
            saves: 6, // 2 points from saves
            penalties_saved: 1,
            penalties_missed: 0,
            own_goals: 0,
            yellow_cards: 0,
            red_cards: 0,
            rating: 92, // 9.2 -> +3
            tackles: 0,
            interceptions: 0,
            successful_dribbles: 0,
            free_kick_goals: 0,
        };

        let (base, add, sub) = calculate_player_points(&stats, POSITION_GK);

        // 2 (minutes) + 4 (clean sheet) + 2 (6 saves / 3) + 5 (pen saved) = 13
        assert!(base == 13, 1);
        // Rating 9.2 -> +3
        assert!(add == 3, 2);
        assert!(sub == 0, 3);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    fun test_calculate_player_points_with_deductions(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) {
        setup_test(aptos_framework, admin, user1, user2);

        let stats = PlayerStats {
            player_id: 1,
            position: POSITION_DEF,
            minutes_played: 90,
            goals: 0,
            assists: 0,
            clean_sheet: false,
            saves: 0,
            penalties_saved: 0,
            penalties_missed: 1, // -2
            own_goals: 1, // -2
            yellow_cards: 1, // -1
            red_cards: 0,
            rating: 55, // Below 6.0 -> -1
            tackles: 0,
            interceptions: 0,
            successful_dribbles: 0,
            free_kick_goals: 0,
        };

        let (base, add, sub) = calculate_player_points(&stats, POSITION_DEF);

        // 2 (minutes) - 5 (deductions) = 0 (clamped)
        assert!(base == 0, 1);
        assert!(add == 0, 2);
        // Rating < 6.0 with minutes > 0 -> -1
        assert!(sub == 1, 3);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    fun test_validate_formation_valid(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) {
        setup_test(aptos_framework, admin, user1, user2);

        // Valid 4-3-3
        let positions = vector[0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 1, 2, 3];
        validate_formation(&positions);
        // No abort = success
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    #[expected_failure(abort_code = EINVALID_POSITION_COUNT)]
    fun test_validate_formation_invalid_no_gk(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) {
        setup_test(aptos_framework, admin, user1, user2);

        // No goalkeeper
        let positions = vector[1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 1, 2, 3];
        validate_formation(&positions);
    }

    #[test(aptos_framework = @0x1, admin = @fantasy_epl_addr, user1 = @0x123, user2 = @0x456)]
    fun test_multiple_gameweeks(aptos_framework: &signer, admin: &signer, user1: &signer, user2: &signer) acquires Config, GameweekRegistry {
        setup_test(aptos_framework, admin, user1, user2);

        create_gameweek(admin, 1);
        create_gameweek(admin, 2);
        create_gameweek(admin, 3);

        let (id1, _, _, _) = get_gameweek(1);
        let (id2, _, _, _) = get_gameweek(2);
        let (id3, _, _, _) = get_gameweek(3);

        assert!(id1 == 1, 1);
        assert!(id2 == 2, 2);
        assert!(id3 == 3, 3);

        let current = get_current_gameweek();
        assert!(current == 3, 4);
    }
}

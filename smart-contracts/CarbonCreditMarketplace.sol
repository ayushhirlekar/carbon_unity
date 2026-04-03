// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CarbonCreditMarketplace
 * @notice Carbon credit minting, purchasing, transfer, and retirement
 * @dev Admin-managed carbon credit marketplace on Ethereum Sepolia
 *
 * Deploy via Remix IDE → Inject Web3 → Sepolia Network
 */
contract CarbonCreditMarketplace {

    // ============================================
    // STATE
    // ============================================

    address public admin;
    uint256 public totalSupply;
    uint256 public totalRetired;

    // Credit balances per address
    mapping(address => uint256) public balances;

    // Project credits: projectId => total minted
    mapping(uint256 => uint256) public projectCredits;

    // Listing struct for on-chain purchase tracking
    struct Listing {
        uint256 projectId;
        address seller;
        uint256 credits;
        uint256 pricePerCreditWei;
        bool active;
    }

    // Listings: listingId => Listing
    mapping(uint256 => Listing) public listings;
    uint256 public nextListingId;

    // ============================================
    // EVENTS
    // ============================================

    event CreditsMinted(
        uint256 indexed projectId,
        uint256 amount,
        address indexed admin,
        uint256 timestamp
    );

    event ListingCreated(
        uint256 indexed listingId,
        uint256 indexed projectId,
        address indexed seller,
        uint256 credits,
        uint256 pricePerCreditWei
    );

    event CreditsPurchased(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 credits,
        uint256 ethPaid,
        uint256 timestamp
    );

    event CreditsTransferred(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );

    event CreditsRetired(
        address indexed account,
        uint256 amount,
        uint256 timestamp
    );

    event ListingCancelled(
        uint256 indexed listingId,
        uint256 timestamp
    );

    event AdminTransferred(
        address indexed previousAdmin,
        address indexed newAdmin
    );

    // ============================================
    // MODIFIERS
    // ============================================

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    modifier validAddress(address _addr) {
        require(_addr != address(0), "Invalid address");
        _;
    }

    // Reentrancy guard
    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    modifier noReentrant() {
        require(_status != _ENTERED, "Reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // ============================================
    // CONSTRUCTOR
    // ============================================

    constructor() {
        admin = msg.sender;
        nextListingId = 1;
        _status = _NOT_ENTERED;
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Mint carbon credits for a verified project
     * @param projectId Off-chain project identifier
     * @param amount Number of credits to mint
     */
    function mintCredits(uint256 projectId, uint256 amount) external onlyAdmin {
        require(amount > 0, "Amount must be greater than 0");
        require(projectId > 0, "Invalid project ID");

        // Check for overflow
        require(balances[admin] + amount >= balances[admin], "Balance overflow");
        require(totalSupply + amount >= totalSupply, "Total supply overflow");
        require(projectCredits[projectId] + amount >= projectCredits[projectId], "Project credits overflow");

        balances[admin] += amount;
        totalSupply += amount;
        projectCredits[projectId] += amount;

        emit CreditsMinted(projectId, amount, admin, block.timestamp);
    }

    /**
     * @notice Create an on-chain listing for credits
     * @param projectId Associated project ID
     * @param credits Number of credits to list
     * @param pricePerCreditWei Price per credit in wei
     */
    function createListing(
        uint256 projectId,
        uint256 credits,
        uint256 pricePerCreditWei
    ) external onlyAdmin {
        require(credits > 0, "Credits must be greater than 0");
        require(pricePerCreditWei > 0, "Price must be greater than 0");
        require(balances[admin] >= credits, "Insufficient balance to list");
        require(projectId > 0, "Invalid project ID");

        uint256 listingId = nextListingId++;

        listings[listingId] = Listing({
            projectId: projectId,
            seller: admin,
            credits: credits,
            pricePerCreditWei: pricePerCreditWei,
            active: true
        });

        // Lock credits from admin balance
        balances[admin] -= credits;

        emit ListingCreated(listingId, projectId, admin, credits, pricePerCreditWei);
    }

    /**
     * @notice Cancel an active listing and return credits
     * @param listingId ID of the listing to cancel
     */
    function cancelListing(uint256 listingId) external onlyAdmin {
        require(listingId > 0 && listingId < nextListingId, "Invalid listing ID");
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing is not active");

        listing.active = false;
        balances[admin] += listing.credits;

        emit ListingCancelled(listingId, block.timestamp);
    }

    /**
     * @notice Transfer admin role to a new address
     * @param newAdmin Address of the new admin
     */
    function transferAdmin(address newAdmin) external onlyAdmin validAddress(newAdmin) {
        require(newAdmin != admin, "New admin must be different");
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }

    // ============================================
    // BUYER FUNCTIONS
    // ============================================

    /**
     * @notice Purchase credits from a listing
     * @param listingId ID of the listing to purchase from
     * @param credits Number of credits to purchase
     */
    function purchaseCredits(
        uint256 listingId,
        uint256 credits
    ) external payable noReentrant {
        require(listingId > 0 && listingId < nextListingId, "Invalid listing ID");
        Listing storage listing = listings[listingId];

        require(listing.active, "Listing is not active");
        require(credits > 0, "Must purchase at least 1 credit");
        require(credits <= listing.credits, "Not enough credits in listing");

        uint256 totalCost = credits * listing.pricePerCreditWei;
        
        // Check for overflow in multiplication
        require(totalCost / listing.pricePerCreditWei == credits, "Price calculation overflow");
        require(msg.value >= totalCost, "Insufficient ETH sent");

        // Update state before external calls (Checks-Effects-Interactions pattern)
        listing.credits -= credits;
        balances[msg.sender] += credits;

        // Deactivate listing if fully purchased
        if (listing.credits == 0) {
            listing.active = false;
        }

        // Send ETH to seller (admin)
        (bool sent, ) = payable(listing.seller).call{value: totalCost}("");
        require(sent, "ETH transfer failed");

        // Refund excess ETH
        uint256 excess = msg.value - totalCost;
        if (excess > 0) {
            (bool refunded, ) = payable(msg.sender).call{value: excess}("");
            require(refunded, "Refund failed");
        }

        emit CreditsPurchased(listingId, msg.sender, credits, totalCost, block.timestamp);
    }

    // ============================================
    // TRANSFER & RETIRE
    // ============================================

    /**
     * @notice Transfer credits to another address
     * @param to Recipient address
     * @param amount Number of credits to transfer
     */
    function transfer(
        address to,
        uint256 amount
    ) external validAddress(to) {
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(to != msg.sender, "Cannot transfer to self");

        balances[msg.sender] -= amount;
        balances[to] += amount;

        emit CreditsTransferred(msg.sender, to, amount, block.timestamp);
    }

    /**
     * @notice Permanently retire credits (offset carbon)
     * @param amount Number of credits to retire
     */
    function retireCredits(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;
        totalSupply -= amount;
        totalRetired += amount;

        emit CreditsRetired(msg.sender, amount, block.timestamp);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Get credit balance for an account
     * @param account Address to check
     * @return Credit balance
     */
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    /**
     * @notice Get listing details
     * @param listingId ID of the listing
     * @return projectId The project ID associated with the listing
     * @return seller The address of the seller
     * @return credits The number of credits available
     * @return pricePerCreditWei The price per credit in wei
     * @return active Whether the listing is active
     */
    function getListing(uint256 listingId) external view returns (
        uint256 projectId,
        address seller,
        uint256 credits,
        uint256 pricePerCreditWei,
        bool active
    ) {
        Listing storage l = listings[listingId];
        return (l.projectId, l.seller, l.credits, l.pricePerCreditWei, l.active);
    }

    /**
     * @notice Get total credits minted for a project
     * @param projectId Project ID
     * @return Total credits minted
     */
    function getProjectCredits(uint256 projectId) external view returns (uint256) {
        return projectCredits[projectId];
    }

    /**
     * @notice Get contract summary stats
     * @return _totalSupply The total supply of credits
     * @return _totalRetired The total number of retired credits
     * @return _nextListingId The next listing ID to be used
     */
    function getStats() external view returns (
        uint256 _totalSupply,
        uint256 _totalRetired,
        uint256 _nextListingId
    ) {
        return (totalSupply, totalRetired, nextListingId);
    }
}

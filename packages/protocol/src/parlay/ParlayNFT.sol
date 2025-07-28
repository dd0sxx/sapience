// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IParlayNFT.sol";

/**
 * @title ParlayNFT
 * @notice NFT contract for Parlay Pool system
 */
contract ParlayNFT is IParlayNFT, ERC721, Ownable {
    
    // Mapping from token ID to parlay data
    mapping(uint256 => bytes) private _parlayData;
    
    // Mapping from token ID to settlement status
    mapping(uint256 => bool) private _settled;
    
    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) Ownable(msg.sender) {}
    
    /**
     * @notice Mint a new parlay NFT (only callable by authorized contracts)
     * @param to Address to mint the NFT to
     * @param tokenId Token ID for the NFT
     * @param parlayData Encoded parlay data
     */
    function mint(address to, uint256 tokenId, bytes calldata parlayData) external override onlyOwner {
        _mint(to, tokenId);
        _parlayData[tokenId] = parlayData;
        _settled[tokenId] = false;
    }
    
    /**
     * @notice Burn a parlay NFT (only callable by authorized contracts)
     * @param tokenId Token ID to burn
     */
    function burn(uint256 tokenId) external override onlyOwner {
        _burn(tokenId);
        delete _parlayData[tokenId];
        delete _settled[tokenId];
    }
    
    /**
     * @notice Get parlay data stored in NFT
     * @param tokenId Token ID
     * @return parlayData Encoded parlay data
     */
    function getParlayData(uint256 tokenId) external view override returns (bytes memory parlayData) {
        require(_exists(tokenId), "Token does not exist");
        return _parlayData[tokenId];
    }
    
    /**
     * @notice Check if a parlay NFT exists and is valid
     * @param tokenId Token ID to check
     * @return exists Whether the NFT exists
     * @return isSettled Whether the parlay has been settled
     */
    function parlayStatus(uint256 tokenId) external view override returns (bool exists, bool isSettled) {
        exists = _exists(tokenId);
        isSettled = _settled[tokenId];
    }
    
    /**
     * @notice Mark a parlay as settled (only callable by authorized contracts)
     * @param tokenId Token ID to mark as settled
     */
    function markSettled(uint256 tokenId) external onlyOwner {
        require(_exists(tokenId), "Token does not exist");
        _settled[tokenId] = true;
    }
    
    /**
     * @notice Override _exists to check if token was minted
     */
    function _exists(uint256 tokenId) internal view override returns (bool) {
        return super._exists(tokenId);
    }
} 
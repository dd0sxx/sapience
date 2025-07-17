pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ParlayNFT is ERC721, Ownable {
    constructor() ERC721("Parlay", "PRLY") Ownable(msg.sender) {
        // The deployer of this contract will be the owner.
    }

    function mint(address to, uint256 tokenId) public onlyOwner {
        _safeMint(to, tokenId);
    }

    function burn(uint256 tokenId) public onlyOwner {
        _burn(tokenId);
    }
}


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev 测试/E2E 专用：TapeOut 处理器 + NAND 晶体管的最小桩。
///      真实部署走 CPU Factory 自部署 processor（docs/tapeid-port-plan.md）。
///      价格刻意小（1 门 ≈ 0.0008 ETH），只验证分账与所有权流。
contract MockTapeProcessor {
    uint256 public tapeoutFee = 0.0005 ether;
    uint256 public mintPrice  = 0.0001 ether; // 每门 NAND
    uint256 public protocolFee = 0.0002 ether;

    uint256 public nextId;
    mapping(uint256 => address) public ownerOf;
    mapping(uint256 => bytes) public netlistOf;

    /// 流片费用一键报价（AgentPackCore.tapeCost 同式）
    function quote(uint256 gates) external view returns (uint256) {
        return gates * mintPrice + protocolFee + tapeoutFee;
    }

    /*──── ITapeOutProcessor ────*/
    function transistors() external view returns (address) { return address(this); }
    function TAPEOUT_FEE() external view returns (uint256) { return tapeoutFee; }

    function tapeout(bytes calldata nl, uint32, uint32) external payable returns (uint256 id) {
        require(msg.value >= tapeoutFee, "fee");
        id = ++nextId;
        ownerOf[id] = msg.sender;
        netlistOf[id] = nl;
    }

    function transferFrom(address, address to, uint256 id) external {
        require(ownerOf[id] == msg.sender, "not owner");
        ownerOf[id] = to;
    }

    /*──── ITransistors（NAND = token 0，按门烧；桩里只收钱）────*/
    function mint(uint256, uint256 amount) external payable {
        require(msg.value >= amount * mintPrice + protocolFee, "nand");
    }

    /// 真处理器的免费 view：拿输入字问电路。桩按 netlist 语义回答 NOT(bit0)。
    function eval(uint256 id, bytes calldata inputs) external view returns (bytes memory) {
        require(ownerOf[id] != address(0), "no circuit");
        uint8 a = inputs.length > 0 ? uint8(inputs[0]) : 0;
        return abi.encodePacked(uint8((~a) & 1));
    }
}

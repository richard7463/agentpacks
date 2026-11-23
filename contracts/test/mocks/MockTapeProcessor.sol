// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev 测试/E2E 专用：TapeOut 处理器 + NAND 晶体管的最小桩。
///      真实部署走 CPU Factory 自部署 processor（docs/tapeid-port-plan.md）。
///      价格刻意小（1 门 ≈ 0.0008 ETH），只验证分账与所有权流。
interface IBEMLike { function transferFrom(address,address,uint256) external returns (bool); }

contract MockTapeProcessor {
    address public immutable bem;
    constructor(address bem_) { bem = bem_; }

    uint256 public tapeoutFee = 0.0005 ether;
    uint256 public mintPrice  = 0.0001 ether; // 每门 NAND
    uint256 public protocolFee = 0.0002 ether;

    uint256 public nextId;
    mapping(uint256 => address) public ownerOf;
    mapping(uint256 => bytes) public netlistOf;
    mapping(uint256 => uint32) public nInOf;
    mapping(uint256 => uint32) public nOutOf;
    bool public failEval; // 模拟处理器宕机/被攻击：eval 直接 revert
    function setFailEval(bool v) external { failEval = v; }

    /// 流片费用一键报价（AgentPackCore.tapeCost 同式）
    function quote(uint256 gates) external view returns (uint256) {
        return gates * mintPrice + protocolFee + tapeoutFee;
    }

    /*──── ITapeOutProcessor ────*/
    function transistors() external view returns (address) { return address(this); }
    function TAPEOUT_FEE() external view returns (uint256) { return tapeoutFee; }

    function tapeout(bytes calldata nl, uint32 nIn, uint32 nOut) external payable returns (uint256 id) {
        require(msg.value >= tapeoutFee, "fee");
        id = ++nextId;
        ownerOf[id] = msg.sender;
        netlistOf[id] = nl;
        nInOf[id] = nIn;
        nOutOf[id] = nOut;
    }

    function transferFrom(address, address to, uint256 id) external {
        require(ownerOf[id] == msg.sender, "not owner");
        ownerOf[id] = to;
    }

    /*──── ITransistors（NAND = token 0，按门烧；桩里只收钱）────*/
    function mint(uint256, uint256 amount) external payable {
        uint256 need = amount * mintPrice + protocolFee;
        if (bem != address(0)) {
            require(IBEMLike(bem).transferFrom(msg.sender, address(this), need), "bem");
        } else {
            require(msg.value >= need, "nand");
        }
    }

    /// 真处理器的免费 view：拿输入字问电路。这里实现真实 NAND 求值
    /// （信号编号同 TapeOut：0=常量0，1=常量1，2..nIn+1=输入，之后逐门）。
    function eval(uint256 id, bytes calldata inputs) external view returns (bytes memory) {
        require(!failEval, "processor down");
        require(ownerOf[id] != address(0), "no circuit");
        bytes memory nl = netlistOf[id];
        require(nl.length % 7 == 0, "bad netlist");
        uint256 gates = nl.length / 7;
        // 信号数组：2 常量 + 输入位 + 每门一信号
        uint256 nIn = nInOf[id]; // 真实网表的输入位数（由 tapeout 记录）
        require(inputs.length * 8 >= nIn, "short inputs");
        uint256[] memory sig = new uint256[](2 + nIn + gates);
        sig[1] = 1;
        for (uint256 i = 0; i < nIn; i++) {
            sig[2 + i] = (uint8(inputs[i / 8]) >> (i % 8)) & 1;
        }
        for (uint256 g = 0; g < gates; g++) {
            uint256 a = _u24(nl, g * 7 + 1);
            uint256 b = _u24(nl, g * 7 + 4);
            require(a < 2 + nIn + g && b < 2 + nIn + g, "future signal");
            sig[2 + nIn + g] = (sig[a] & sig[b]) == 1 ? 0 : 1; // NAND
        }
        // nOut = 2：最后两个信号 = allow, ask → 打包 1 字节
        uint8 out = uint8(sig[2 + nIn + gates - 2] | (sig[2 + nIn + gates - 1] << 1));
        return abi.encodePacked(out);
    }

    function _u24(bytes memory d, uint256 off) internal pure returns (uint256 v) {
        v = (uint256(uint8(d[off])) << 16) | (uint256(uint8(d[off + 1])) << 8) | uint256(uint8(d[off + 2]));
    }
}

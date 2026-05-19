import { createPublicClient, http, formatEther } from "viem";
import { mainnet } from "wagmi/chains";

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

export function formatEth(value: bigint): string {
  return formatEther(value);
}

export function shortenAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

import { http, createConfig } from "wagmi";
import { mainnet } from "wagmi/chains";
import { connectorsForWallets, getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  coinbaseWallet,
  metaMaskWallet,
  phantomWallet,
  rabbyWallet,
} from "@rainbow-me/rainbowkit/wallets";

const alchemyUrl = process.env.NEXT_PUBLIC_ALCHEMY_API_URL;

export const wagmiConfig = getDefaultConfig({
  appName: "0xPixel",
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? "YOUR_PROJECT_ID",
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(alchemyUrl),
  },
});

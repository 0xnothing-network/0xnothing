import { http, createConfig } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";

const alchemyUrl = process.env.NEXT_PUBLIC_ALCHEMY_API_URL;
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? "";

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    walletConnect({
      projectId: walletConnectProjectId,
      metadata: {
        name: "0xPixel",
        description: "0xPixel - Pixel Network",
        url: "https://0xnothing.xyz",
        icons: ["https://0xnothing.xyz/icon.svg"],
      },
      showQrModal: true,
    }),
    coinbaseWallet({
      appName: "0xPixel",
      appLogoUrl: "https://0xnothing.xyz/icon.svg",
      version: "4",
    }),
    injected({
      target: "metaMask",
    }),
  ],
  transports: {
    [mainnet.id]: http(alchemyUrl),
    [sepolia.id]: http(alchemyUrl),
  },
});

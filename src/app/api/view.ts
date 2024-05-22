import { NextApiRequest, NextApiResponse } from "next";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, base } from "viem/chains";
import pinataSDK, { PinataPinOptions } from '@pinata/sdk';
import { getTokenIdFromTxHash } from "../helpers/get-nft-id";
import { easterEggABI } from "../txdata/contracts/easter-egg";
import generateEasterEggImage from "../helpers/generate-easter-eg";
import uploadToPinata from "../helpers/pinata-pin";

const client = createPublicClient({
    //chain: baseSepolia, // TODO update to Base for production
    chain: base,
    transport: http()
});

const walletClient = createWalletClient({
    //chain: baseSepolia,
    chain: base,
    transport: http()
});

const account = privateKeyToAccount(`0x${process.env.DEPLOYER_PK}`);
const pinata = new pinataSDK({ pinataJWTKey: process.env.PINATA_JWT });

export async function POST(req: NextApiRequest, res: NextApiResponse) {
    console.log(`fetching view url`)
    let imageUri: string | undefined;
    if (req.method === "POST") {
        const { txHash } = req.body;
        try {
            const tokenId = await getTokenIdFromTxHash(txHash);
                if (tokenId) {
                    console.log(`Token ID: ${tokenId}`);
                    const isUriSet = await client.readContract({
                        //address: `0x${process.env.NFT_CONTRACT_BASE_SEPOLIA_ADDRESS}`,
                        address: `0x${process.env.NFT_CONTRACT_BASE_ADDRESS}`,
                        abi: easterEggABI.abi,
                        functionName: 'tokenIdUriHasBeenSet',
                        args: [BigInt(tokenId)]
                    });
                    if (isUriSet) {
                        // get URI already set and return image url
                        console.log(`URI Already Set...fetching metadata...`);
                        const uri = await client.readContract({
                            //address: `0x${process.env.NFT_CONTRACT_BASE_SEPOLIA_ADDRESS}`,
                            address: `0x${process.env.NFT_CONTRACT_BASE_ADDRESS}`,
                            abi: easterEggABI.abi,
                            functionName: 'tokenURI',
                            args: [tokenId]
                        });
                        // strip CID from uri:
                        const cid = uri?.toString().replace('ipfs://', '');
                        const metadataUrl = `https://${process.env.PINATA_IPFS_GATEWAY}/ipfs/${cid}`;
                        const response = await fetch(metadataUrl);
                        const data = await response.json();
                        res.status(200).json({ imageUri: data.firebaseImgUrl ?? data?.image });
                    } else {
                        // create image and update metadata url on chain
                        try {
                            const { img, name, attributes} = await generateEasterEggImage(tokenId);
                            if (img && name && attributes) {
                                const urls = await uploadToPinata(img, name, attributes);
                                if (urls) {
                                    // update on-chain data for token id
                                    const updateHash = await walletClient.writeContract({
                                        //address: `0x${process.env.NFT_CONTRACT_BASE_SEPOLIA_ADDRESS}`,
                                        address: `0x${process.env.NFT_CONTRACT_BASE_ADDRESS}`,
                                        abi: easterEggABI.abi,
                                        functionName: 'setTokenURI',
                                        args: [tokenId, urls.metadataIpfsUrl],
                                        account: account
                                    });
                                    console.log(`Token URI Updated for ${tokenId} (${updateHash})`);
                                    // return the firebase img url
                                    console.log(`urls: ${JSON.stringify(urls)}`)
                                    res.status(200).json({ imageUri: urls.firebaseImgUrl ?? urls?.ipfsImgUrl });
                                };
                            }
                        } catch (e) {
                            console.error(`Error creating image: ${e}`)
                        }
                    }
                }
             res.status(200).json({ imageUri: undefined });
        } catch (e) {

        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} not allowed`)
    }
    res.status(200).json({ imageUri: undefined });
    return { imageUri }
}
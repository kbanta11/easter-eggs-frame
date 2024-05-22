import { NextApiRequest, NextApiResponse } from "next";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, base } from "viem/chains";
import pinataSDK, { PinataPinOptions } from '@pinata/sdk';
import { getTokenIdFromTxHash } from "../../helpers/get-nft-id";
import { easterEggABI } from "../../txdata/contracts/easter-egg";
import generateEasterEggImage from "../../helpers/generate-easter-eg";
import uploadToPinata from "../../helpers/pinata-pin";
import { NextRequest, NextResponse } from "next/server";

const client = createPublicClient({
    chain: base,
    transport: http()
});

const walletClient = createWalletClient({
    chain: base,
    transport: http()
});

const account = privateKeyToAccount(`0x${process.env.DEPLOYER_PK}`);
const pinata = new pinataSDK({ pinataJWTKey: process.env.PINATA_JWT });

export function GET(req: NextRequest) {
    return NextResponse.json({ message: 'Invalid GET Method' }, { status: 404 });
}

export async function POST(req: NextRequest) {
    console.log(`fetching view url, request: ${JSON.stringify(req)} / ${req.method} / ${JSON.stringify(req.body)}`)
    let imageUri: string | undefined;
    if (req.method === "POST") {
        const { tx: txHash } = await req.json();

        if (!txHash) {
            console.log(`No Transaction Hash: ${txHash}`)
            return NextResponse.json({ success: false, message: 'No Transaction Hash'}, {status: 404});
        }
        try {
            const tokenId = await getTokenIdFromTxHash(txHash);
                if (tokenId) {
                    console.log(`Token ID: ${tokenId}`);
                    const isUriSet = await client.readContract({
                        address: `0x${process.env.NFT_CONTRACT_BASE_ADDRESS}`,
                        abi: easterEggABI.abi,
                        functionName: 'tokenIdUriHasBeenSet',
                        args: [BigInt(tokenId)]
                    });
                    if (isUriSet) {
                        // get URI already set and return image url
                        console.log(`URI Already Set...fetching metadata...`);
                        const uri = await client.readContract({
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
                        return NextResponse.json(
                            { success: true, imageUri: data.firebaseImgUrl ?? data?.image },
                            { status: 200 }
                        );
                    } else {
                        // create image and update metadata url on chain
                        try {
                            const { img, name, attributes} = await generateEasterEggImage(tokenId);
                            if (img && name && attributes) {
                                const urls = await uploadToPinata(img, name, attributes);
                                if (urls) {
                                    // update on-chain data for token id
                                    const updateHash = await walletClient.writeContract({
                                        address: `0x${process.env.NFT_CONTRACT_BASE_ADDRESS}`,
                                        abi: easterEggABI.abi,
                                        functionName: 'setTokenURI',
                                        args: [tokenId, urls.metadataIpfsUrl],
                                        account: account
                                    });
                                    console.log(`Token URI Updated for ${tokenId} (${updateHash})`);
                                    // return the firebase img url
                                    console.log(`urls: ${JSON.stringify(urls)}`)
                                    return NextResponse.json(
                                        { success: true, imageUri: urls.firebaseImgUrl ?? urls?.ipfsImgUrl },
                                        { status: 200 },
                                    );
                                };
                            }
                        } catch (e) {
                            console.error(`Error creating image: ${e}`)
                        }
                    }
                }
             return NextResponse.json(
                { success: true, imageUri: undefined },
                { status: 200 }
             );
        } catch (e) {

        }
    } else {
        const headers = new Headers();
        headers.set('Allow', 'POST');
        const res = NextResponse.next({
            request: {
                headers: headers
            }
        });
        return NextResponse.json(
            { success: false, message: `Method ${req.method} not allowed`},
            { status: 405 }
        );
    }
    return NextResponse.json(
        { success: true, imageUri: undefined },
        { status: 200 }
    );
}
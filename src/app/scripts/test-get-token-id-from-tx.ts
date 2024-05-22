import { base } from "viem/chains";
import { getTokenIdFromTxHash } from "../helpers/get-nft-id";
import { Abi, createPublicClient, createWalletClient, http } from 'viem';
import { easterEggABI } from "../txdata/contracts/easter-egg";
import generateEasterEggImage from "../helpers/generate-easter-eg";
import uploadToPinata from "../helpers/pinata-pin";
import { privateKeyToAccount } from "viem/accounts";
require('dotenv').config();

const client = createPublicClient({
    chain: base, // TODO update to Base for production
    transport: http()
});

const walletClient = createWalletClient({
    chain: base,
    transport: http()
});

const account = privateKeyToAccount(`0x${process.env.DEPLOYER_PK}`);

const main = async () => {
    const txHash = '0xfcf0c0ebf7fffbb6d6cc2affbbe72fe18c8d23d25812d7190b9ced1684763ac9';
    // const txHash = '0xe3e6e07b97e6d800fab027f60f342bd6c68c6f1efb70b664d689bfe6b07f08ff'
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
            console.log(`data: ${JSON.stringify(data)} / img: ${data.image}`);
            return data.image;
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
                        return urls.firebaseImgUrl;
                    };
                }
            } catch (e) {
                console.error(`Error creating image: ${e}`)
            }
        }
    }
    return undefined;
}

main();
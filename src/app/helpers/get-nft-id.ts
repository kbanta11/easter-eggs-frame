import { baseSepolia, base } from 'viem/chains';
import { easterEggABI } from '../txdata/contracts/easter-egg';
import { Abi, createPublicClient, decodeEventLog, http, parseEventLogs } from 'viem';

export const getTokenIdFromTxHash = async (tx: string) => {
    try {
        const client = createPublicClient({
            chain: base, // TODO update to Base for production
            transport: http()
        });
    
        if (tx.substring(0,2) === '0x') {
            tx = tx.substring(2);
        }
        const receipt = await client.getTransactionReceipt({ hash: `0x${tx}`});
        const logs = parseEventLogs({
            abi: easterEggABI.abi,
            eventName: 'Transfer',
            logs: receipt.logs
        });

        // console.log(`Logs: ${JSON.stringify(logs, (key, value) => {
        //     return typeof value === 'bigint' ? value.toString() : value;
        // })}`)
        const mintEvent: any = (logs.map((l) => {
            console.log(l)
            return decodeEventLog({...l, abi: easterEggABI.abi})
        }).find((f) => {
            const eventArgs: any = f.args;
            return eventArgs?.tokenId;
        })?.args);
        const tokenId = parseInt(mintEvent?.tokenId);
        return tokenId;
    } catch (e) {
        console.error(`Error: ${e}`)
    }
}
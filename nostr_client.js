/**
 * Nostr Relay Client
 * 
 * Connects to Nostr relays and reads events
 * Usage: node nostr_client.js <relay_url> [npub_or_nprofile]
 */

const WebSocket = require('ws');

class NostrClient {
    constructor(relayUrl) {
        this.relayUrl = relayUrl;
        this.ws = null;
        this.subscriptions = new Map();
    }

    connect() {
        return new Promise((resolve, reject) => {
            console.log(`Connecting to ${this.relayUrl}...`);
            
            this.ws = new WebSocket(this.relayUrl);
            
            this.ws.on('open', () => {
                console.log('✅ Connected\n');
                resolve();
            });
            
            this.ws.on('message', (data) => {
                this.handleMessage(data);
            });
            
            this.ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error.message);
                reject(error);
            });
            
            this.ws.on('close', () => {
                console.log('Connection closed');
            });
            
            // Timeout after 10 seconds
            setTimeout(() => {
                if (this.ws.readyState !== WebSocket.OPEN) {
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    }

    handleMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            const [type, ...rest] = message;
            
            if (type === 'EVENT') {
                const [subscriptionId, event] = rest;
                this.handleEvent(subscriptionId, event);
            } else if (type === 'OK') {
                const [eventId, success, message] = rest;
                console.log(`Event ${eventId}: ${success ? '✅ Accepted' : '❌ Rejected'}`);
                if (message) console.log(`   ${message}`);
            } else if (type === 'EOSE') {
                const [subscriptionId] = rest;
                console.log(`\n📤 End of stored events for subscription: ${subscriptionId}\n`);
            } else if (type === 'NOTICE') {
                const [notice] = rest;
                console.log(`⚠️  NOTICE: ${notice}`);
            }
        } catch (error) {
            console.error('Failed to parse message:', error.message);
        }
    }

    handleEvent(subscriptionId, event) {
        const { kind, content, created_at, pubkey, tags } = event;
        
        // Parse timestamp
        const timestamp = new Date(created_at * 1000).toISOString();
        
        // Get event type
        const eventTypes = {
            0: 'Metadata',
            1: 'Text Note',
            30000: 'Live Event',
        };
        const eventType = eventTypes[kind] || `Kind ${kind}`;
        
        // Display event
        console.log('─'.repeat(60));
        console.log(`📌 ${eventType} | ${timestamp}`);
        console.log(`👤 ${pubkey.slice(0, 16)}...`);
        
        // Show hashtags
        const hashtags = tags.filter(t => t[0] === 't').map(t => `#${t[1]}`);
        if (hashtags.length > 0) {
            console.log(`🏷️  ${hashtags.join(' ')}`);
        }
        
        // Show content (truncate if long)
        const displayContent = content || '';
        if (displayContent.length > 200) {
            console.log(`\n${displayContent.slice(0, 197)}...\n`);
        } else if (displayContent.length > 0) {
            console.log(`\n${displayContent}\n`);
        } else {
            console.log(`\n(No content)\n`);
        }
    }

    subscribe(subscriptionId, filters = {}) {
        const request = [
            'REQ',
            subscriptionId,
            {
                limit: 10,
                ...filters
            }
        ];
        
        console.log(`🔔 Subscribing: ${subscriptionId}`);
        console.log(`   Filters: ${JSON.stringify(filters)}\n`);
        
        this.ws.send(JSON.stringify(request));
        this.subscriptions.set(subscriptionId, filters);
    }

    unsubscribe(subscriptionId) {
        const request = ['CLOSE', subscriptionId];
        this.ws.send(JSON.stringify(request));
        this.subscriptions.delete(subscriptionId);
        console.log(`🔕 Unsubscribed: ${subscriptionId}`);
    }

    close() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// CLI usage
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
Usage: node nostr_client.js <relay_url> [options]

Options:
  --author <pubkey>    Filter by author pubkey (hex)
  --kind <number>      Filter by event kind (1=text, 0=metadata)
  --limit <number>     Max events to fetch (default: 10)
  --tag <name> <value> Filter by tag

Examples:
  node nostr_client.js wss://news.utxo.one
  node nostr_client.js wss://news.utxo.one --kind 1 --limit 20
  node nostr_client.js wss://relay.damus.io --author <pubkey>
`);
        process.exit(0);
    }
    
    const relayUrl = args[0];
    const client = new NostrClient(relayUrl);
    
    try {
        await client.connect();
        
        // Parse options
        const filters = { limit: 10 };
        
        for (let i = 1; i < args.length; i++) {
            if (args[i] === '--author' && args[i + 1]) {
                filters.authors = [args[i + 1]];
                i++;
            } else if (args[i] === '--kind' && args[i + 1]) {
                filters.kinds = [parseInt(args[i + 1])];
                i++;
            } else if (args[i] === '--limit' && args[i + 1]) {
                filters.limit = parseInt(args[i + 1]);
                i++;
            } else if (args[i] === '--tag' && args[i + 1] && args[i + 2]) {
                const tagName = args[i + 1];
                const tagValue = args[i + 2];
                filters[`#${tagName}`] = [tagValue];
                i += 2;
            }
        }
        
        // Subscribe to events
        client.subscribe('news-feed', filters);
        
        // Keep running for 30 seconds
        setTimeout(() => {
            console.log('\n⏱️  Timeout reached, closing connection...');
            client.close();
            process.exit(0);
        }, 30000);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();

module.exports = NostrClient;

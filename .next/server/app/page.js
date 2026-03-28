(()=>{var e={};e.id=931,e.ids=[931],e.modules={7849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},2934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},5403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},4580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},4749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},5869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},76:(e,t,r)=>{"use strict";r.r(t),r.d(t,{GlobalError:()=>a.a,__next_app__:()=>h,originalPathname:()=>u,pages:()=>d,routeModule:()=>g,tree:()=>c}),r(908),r(1506),r(5866);var n=r(3191),o=r(8716),s=r(7922),a=r.n(s),i=r(5231),l={};for(let e in i)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(l[e]=()=>i[e]);r.d(t,l);let c=["",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(r.bind(r,908)),"/Users/asil/.openclaw/workspace/nostr-identity/app/page.tsx"]}]},{layout:[()=>Promise.resolve().then(r.bind(r,1506)),"/Users/asil/.openclaw/workspace/nostr-identity/app/layout.tsx"],"not-found":[()=>Promise.resolve().then(r.t.bind(r,5866,23)),"next/dist/client/components/not-found-error"]}],d=["/Users/asil/.openclaw/workspace/nostr-identity/app/page.tsx"],u="/page",h={require:r,loadChunk:()=>Promise.resolve()},g=new n.AppPageRouteModule({definition:{kind:o.x.APP_PAGE,page:"/page",pathname:"/",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:c}})},7460:(e,t,r)=>{Promise.resolve().then(r.bind(r,5724))},9957:(e,t,r)=>{Promise.resolve().then(r.t.bind(r,2994,23)),Promise.resolve().then(r.t.bind(r,6114,23)),Promise.resolve().then(r.t.bind(r,9727,23)),Promise.resolve().then(r.t.bind(r,9671,23)),Promise.resolve().then(r.t.bind(r,1868,23)),Promise.resolve().then(r.t.bind(r,4759,23))},3986:()=>{},5724:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>j});var n=r(326),o=r(7577);/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */function s(e){return e instanceof Uint8Array||ArrayBuffer.isView(e)&&"Uint8Array"===e.constructor.name}function a(e,t){return!!Array.isArray(t)&&(0===t.length||(e?t.every(e=>"string"==typeof e):t.every(e=>Number.isSafeInteger(e))))}function i(e,t){if("string"!=typeof t)throw Error(`${e}: string expected`);return!0}function l(e){if(!Number.isSafeInteger(e))throw Error(`invalid integer: ${e}`)}function c(e){if(!Array.isArray(e))throw Error("array expected")}function d(e,t){if(!a(!0,t))throw Error(`${e}: array of strings expected`)}function u(e,t){if(!a(!1,t))throw Error(`${e}: array of numbers expected`)}r(7022);let h=(e,t)=>0===t?e:h(t,e%t),g=(e,t)=>e+(t-h(e,t)),m=(()=>{let e=[];for(let t=0;t<40;t++)e.push(2**t);return e})();function p(e,t,r,n){if(c(e),t<=0||t>32)throw Error(`convertRadix2: wrong from=${t}`);if(r<=0||r>32)throw Error(`convertRadix2: wrong to=${r}`);if(g(t,r)>32)throw Error(`convertRadix2: carry overflow from=${t} to=${r} carryBits=${g(t,r)}`);let o=0,s=0,a=m[t],i=m[r]-1,d=[];for(let n of e){if(l(n),n>=a)throw Error(`convertRadix2: invalid data word=${n} from=${t}`);if(o=o<<t|n,s+t>32)throw Error(`convertRadix2: carry overflow pos=${s} from=${t}`);for(s+=t;s>=r;s-=r)d.push((o>>s-r&i)>>>0);let e=m[s];if(void 0===e)throw Error("invalid carry");o&=e-1}if(o=o<<r-s&i,!n&&s>=t)throw Error("Excess padding");if(!n&&o>0)throw Error(`Non-zero padding: ${o}`);return n&&s>0&&d.push(o>>>0),d}function w(e){return function(e){if("function"!=typeof e)throw Error("function expected")}(e),function(...t){try{return e.apply(null,t)}catch(e){}}}"function"==typeof Uint8Array.from([]).toBase64&&Uint8Array.fromBase64;let f=function(...e){let t=e=>e,r=(e,t)=>r=>e(t(r));return{encode:e.map(e=>e.encode).reduceRight(r,t),decode:e.map(e=>e.decode).reduce(r,t)}}(function(e){let t="string"==typeof e?e.split(""):e,r=t.length;d("alphabet",t);let n=new Map(t.map((e,t)=>[e,t]));return{encode:n=>(c(n),n.map(n=>{if(!Number.isSafeInteger(n)||n<0||n>=r)throw Error(`alphabet.encode: digit index outside alphabet "${n}". Allowed: ${e}`);return t[n]})),decode:t=>(c(t),t.map(t=>{i("alphabet.decode",t);let r=n.get(t);if(void 0===r)throw Error(`Unknown letter: "${t}". Allowed: ${e}`);return r}))}}("qpzry9x8gf2tvdw0s3jn54khce6mua7l"),function(e=""){return i("join",e),{encode:t=>(d("join.decode",t),t.join(e)),decode:t=>(i("join.decode",t),t.split(e))}}("")),y=[996825010,642813549,513874426,1027748829,705979059];function x(e){let t=e>>25,r=(33554431&e)<<5;for(let e=0;e<y.length;e++)(t>>e&1)==1&&(r^=y[e]);return r}function b(e,t,r=1){let n=e.length,o=1;for(let t=0;t<n;t++){let r=e.charCodeAt(t);if(r<33||r>126)throw Error(`Invalid prefix (${e})`);o=x(o)^r>>5}o=x(o);for(let t=0;t<n;t++)o=x(o)^31&e.charCodeAt(t);for(let e of t)o=x(o)^e;for(let e=0;e<6;e++)o=x(o);return o^=r,f.encode(p([o%m[30]],30,5,!1))}let v=function(e){let t="bech32"===e?1:734539939,r=function(e,t=!1){if(l(5),e>32)throw Error("radix2: bits should be in (0..32]");if(g(8,e)>32||g(e,8)>32)throw Error("radix2: carry overflow");return{encode:r=>{if(!s(r))throw Error("radix2.encode input should be Uint8Array");return p(Array.from(r),8,e,!t)},decode:r=>(u("radix2.decode",r),Uint8Array.from(p(r,e,8,t)))}}(5),n=r.decode,o=r.encode,a=w(n);function c(e,r,n=90){i("bech32.encode prefix",e),s(r)&&(r=Array.from(r)),u("bech32.encode",r);let o=e.length;if(0===o)throw TypeError(`Invalid prefix length ${o}`);let a=o+7+r.length;if(!1!==n&&a>n)throw TypeError(`Length ${a} exceeds limit ${n}`);let l=e.toLowerCase(),c=b(l,r,t);return`${l}1${f.encode(r)}${c}`}function d(e,r=90){i("bech32.decode input",e);let n=e.length;if(n<8||!1!==r&&n>r)throw TypeError(`invalid string length: ${n} (${e}). Expected (8..${r})`);let o=e.toLowerCase();if(e!==o&&e!==e.toUpperCase())throw Error("String must be lowercase or uppercase");let s=o.lastIndexOf("1");if(0===s||-1===s)throw Error('Letter "1" must be present between prefix and data only');let a=o.slice(0,s),l=o.slice(s+1);if(l.length<6)throw Error("Data must be at least 6 characters long");let c=f.decode(l).slice(0,-6),d=b(a,c,t);if(!l.endsWith(d))throw Error(`Invalid checksum in ${e}: expected "${d}"`);return{prefix:a,words:c}}let h=w(d);return{encode:c,decode:d,encodeFromBytes:function(e,t){return c(e,o(t))},decodeToBytes:function(e){let{prefix:t,words:r}=d(e,!1);return{prefix:t,words:r,bytes:n(r)}},decodeUnsafe:h,fromWords:n,fromWordsUnsafe:a,toWords:o}}("bech32"),k=("function"==typeof Uint8Array.from([]).toHex&&Uint8Array.fromHex,process.env.NEXT_PUBLIC_TEE_URL||"https://p.outlayer.fastnear.com/execute");function S(e,t){let r=function(e){let t=new Uint8Array(e.length/2);for(let r=0;r<t.length;r++)t[r]=parseInt(e.substr(2*r,2),16);return t}(t),n=v.toWords(r);return v.encode(e,n)}function j(){let[e,t]=(0,o.useState)(null),[r,s]=(0,o.useState)(""),[a,i]=(0,o.useState)(!1),[l,c]=(0,o.useState)(""),[d,u]=(0,o.useState)(null),[h,g]=(0,o.useState)(!1),[m,p]=(0,o.useState)(""),w=async()=>{e&&await e.connect()},f=async()=>{e&&await e.disconnect()},y=async()=>{if(r&&e){i(!0),c("");try{let t=await e.wallet(),n=`Generate Nostr identity for ${r}`,o=crypto.randomUUID(),s=await t.signMessage({message:n,nonce:new TextEncoder().encode(o),recipient:"nostr-identity.near"});if(!s||!s.signature)throw Error("Wallet signature required");console.log("✅ NEP-413 signature obtained");let a={account_id:s.accountId,public_key:s.publicKey,signature:s.signature,authRequest:{message:n,nonce:o,recipient:"nostr-identity.near"}},i=await fetch(k,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"generate",account_id:r,nep413_response:a})}),l=await i.json();if(!l.success)throw Error(l.error||"Failed to create identity");if(!l.npub||!l.nsec)throw Error("Invalid response from TEE");let c=S("npub",l.npub),d=S("nsec",l.nsec);u({npub:l.npub,nsec:l.nsec,npubBech32:c,nsecBech32:d,createdAt:l.created_at||Date.now()})}catch(e){c(e.message||"Failed to generate identity"),console.error(e)}finally{i(!1)}}},x=async(e,t)=>{await navigator.clipboard.writeText(e),p(t),setTimeout(()=>p(""),2e3)};return n.jsx("main",{className:"min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-600 to-purple-600",children:(0,n.jsxs)("div",{className:"bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full",children:[n.jsx("h1",{className:"text-4xl font-bold mb-2 text-gray-900",children:"\uD83D\uDD10 Secure NEAR → Nostr Identity"}),n.jsx("p",{className:"text-gray-600 mb-8",children:"Forgery-proof • TEE-Secured"}),n.jsx("div",{className:"bg-green-50 border-l-4 border-green-500 p-4 rounded mb-6",children:(0,n.jsxs)("div",{className:"flex items-center",children:[n.jsx("span",{className:"text-2xl mr-3",children:"\uD83D\uDD12"}),(0,n.jsxs)("div",{children:[n.jsx("p",{className:"font-semibold text-green-900",children:"2-Layer Security"}),n.jsx("p",{className:"text-sm text-green-700",children:"NEP-413 verification + TEE random key generation"})]})]})}),(0,n.jsxs)("div",{className:"bg-gray-50 rounded-xl p-6 mb-6",children:[(0,n.jsxs)("div",{className:"flex items-center mb-4",children:[n.jsx("span",{className:"bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3",children:"1"}),n.jsx("h2",{className:"text-xl font-semibold",children:"Connect NEAR Wallet"})]}),r?(0,n.jsxs)("div",{className:"bg-blue-50 p-4 rounded-lg",children:[(0,n.jsxs)("p",{className:"text-blue-900",children:[n.jsx("strong",{children:"Connected:"})," ",r]}),n.jsx("button",{onClick:f,className:"mt-2 text-sm text-red-600 hover:underline",children:"Disconnect"})]}):n.jsx("button",{onClick:w,className:"w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors",children:"Connect Wallet"})]}),r&&!d&&(0,n.jsxs)("div",{className:"bg-gray-50 rounded-xl p-6 mb-6",children:[(0,n.jsxs)("div",{className:"flex items-center mb-4",children:[n.jsx("span",{className:"bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3",children:"2"}),n.jsx("h2",{className:"text-xl font-semibold",children:"Generate Secure Identity"})]}),(0,n.jsxs)("p",{className:"text-gray-600 mb-4",children:[n.jsx("strong",{children:"\uD83D\uDD12 Security:"})," Uses NEP-413 standard authentication. Only you can generate your identity."]}),(0,n.jsxs)("div",{className:"bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded mb-4",children:[n.jsx("strong",{children:"⚠️ Important:"}),n.jsx("br",{}),n.jsx("span",{className:"text-sm",children:"This version does NOT store keys. You MUST save your private key (nsec) when shown - it cannot be recovered!"})]}),n.jsx("button",{onClick:y,disabled:a,className:"w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400",children:a?"Signing...":"Generate Identity (Requires Signature)"}),l&&n.jsx("div",{className:"mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded",children:n.jsx("p",{className:"text-red-900",children:l})})]}),d&&(0,n.jsxs)("div",{className:"bg-gray-50 rounded-xl p-6 mb-6",children:[(0,n.jsxs)("div",{className:"flex items-center mb-4",children:[n.jsx("span",{className:"bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3",children:"3"}),n.jsx("h2",{className:"text-xl font-semibold",children:"Your Nostr Identity"})]}),n.jsx("div",{className:"bg-green-50 border-l-4 border-green-500 p-4 rounded mb-4",children:"✅ Identity generated with NEP-413 verification!"}),(0,n.jsxs)("div",{className:"mb-4",children:[n.jsx("p",{className:"text-sm text-gray-600 mb-1",children:"Public Key (npub):"}),(0,n.jsxs)("div",{className:"bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm break-all relative",children:[d.npubBech32,n.jsx("button",{onClick:()=>x(d.npubBech32,"npub"),className:"absolute top-2 right-2 bg-gray-700 text-white px-3 py-1 rounded text-xs hover:bg-gray-600",children:"npub"===m?"Copied!":"Copy"})]})]}),(0,n.jsxs)("div",{className:"bg-red-50 border-l-4 border-red-500 p-4 rounded mb-4",children:[n.jsx("strong",{children:"\uD83D\uDD34 SAVE YOUR PRIVATE KEY NOW!"}),n.jsx("br",{}),n.jsx("span",{className:"text-sm",children:"This key cannot be recovered. Write it down or store it securely."})]}),(0,n.jsxs)("div",{className:"mb-4",children:[n.jsx("p",{className:"text-sm text-gray-600 mb-1",children:"Private Key (nsec):"}),(0,n.jsxs)("div",{className:"bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm break-all relative",children:[h?d.nsecBech32:"••••••••••••••••••••••••••••••••",n.jsx("button",{onClick:()=>g(!h),className:"absolute top-2 right-2 bg-gray-700 text-white px-3 py-1 rounded text-xs hover:bg-gray-600",children:h?"Hide":"Show"})]}),n.jsx("button",{onClick:()=>x(d.nsecBech32,"nsec"),className:"w-full mt-2 bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-indigo-700 transition-colors",children:"nsec"===m?"Copied!":"Copy Private Key"})]}),(0,n.jsxs)("div",{className:"bg-white p-4 rounded-lg",children:[n.jsx("h3",{className:"font-semibold mb-3",children:"\uD83D\uDCF1 Import to Nostr Client"}),(0,n.jsxs)("ol",{className:"list-decimal list-inside space-y-2 text-gray-700",children:[(0,n.jsxs)("li",{children:["Copy your ",n.jsx("strong",{children:"private key"})," (nsec) above"]}),n.jsx("li",{children:"Open your Nostr client (Damus, Primal, Amethyst, etc.)"}),n.jsx("li",{children:"Go to Settings → Add Account / Import Key"}),n.jsx("li",{children:"Paste your nsec and save"}),n.jsx("li",{children:"Start posting! \uD83C\uDF89"})]})]}),(0,n.jsxs)("div",{className:"mt-4 bg-gray-100 p-4 rounded-lg",children:[n.jsx("strong",{children:"\uD83D\uDD10 Security Model:"}),n.jsx("br",{}),(0,n.jsxs)("span",{className:"text-sm text-gray-600",children:["Your keys are generated inside a TEE (Trusted Execution Environment).",n.jsx("br",{}),n.jsx("br",{}),"✅ Only YOU can generate this identity (requires wallet signature)",n.jsx("br",{}),"✅ Keys are random (not derived from public data)",n.jsx("br",{}),"✅ Forgery-proof (NEP-413 verification)",n.jsx("br",{}),"⚠️ NOT recoverable - you must save your key!"]})]})]}),(0,n.jsxs)("div",{className:"text-center text-gray-500 text-sm",children:["Powered by"," ",n.jsx("a",{href:"https://near.org",target:"_blank",className:"text-indigo-600 hover:underline",children:"NEAR"})," + ",n.jsx("a",{href:"https://outlayer.fastnear.com",target:"_blank",className:"text-indigo-600 hover:underline",children:"OutLayer TEE"})]})]})})}},1506:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>i,metadata:()=>a});var n=r(9510),o=r(5384),s=r.n(o);r(7272);let a={title:"NEAR → Nostr Identity",description:"Create a Nostr identity bound to your NEAR account via MPC"};function i({children:e}){return n.jsx("html",{lang:"en",children:n.jsx("body",{className:s().className,children:e})})}},908:(e,t,r)=>{"use strict";r.r(t),r.d(t,{$$typeof:()=>a,__esModule:()=>s,default:()=>i});var n=r(8570);let o=(0,n.createProxy)(String.raw`/Users/asil/.openclaw/workspace/nostr-identity/app/page.tsx`),{__esModule:s,$$typeof:a}=o;o.default;let i=(0,n.createProxy)(String.raw`/Users/asil/.openclaw/workspace/nostr-identity/app/page.tsx#default`)},7272:()=>{},6872:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.InjectedWallet=void 0;let n=r(2428);class o{connector;wallet;constructor(e,t){this.connector=e,this.wallet=t}get manifest(){return this.wallet.manifest}async signIn({addFunctionCallKey:e,network:t}){return this.wallet.signIn({network:t??this.connector.network,addFunctionCallKey:e})}async signInAndSignMessage(e){return this.wallet.signInAndSignMessage({network:e?.network??this.connector.network,addFunctionCallKey:e.addFunctionCallKey,messageParams:e.messageParams})}async signOut(e){await this.wallet.signOut({network:e?.network??this.connector.network})}async getAccounts(e){return this.wallet.getAccounts({network:e?.network??this.connector.network})}async signAndSendTransaction(e){let t=(0,n.nearActionsToConnectorActions)(e.actions),r=e.network??this.connector.network,o=await this.wallet.signAndSendTransaction({...e,actions:t,network:r});if(!o)throw Error("No result from wallet");return Array.isArray(o.transactions)?o.transactions[0]:o}async signAndSendTransactions(e){let t=e.network??this.connector.network,r=e.transactions.map(e=>({actions:(0,n.nearActionsToConnectorActions)(e.actions),receiverId:e.receiverId})),o=await this.wallet.signAndSendTransactions({...e,transactions:r,network:t});if(!o)throw Error("No result from wallet");return Array.isArray(o.transactions)?o.transactions:o}async signMessage(e){return this.wallet.signMessage({...e,network:e.network??this.connector.network})}async signDelegateActions(e){return this.wallet.signDelegateActions({...e,delegateActions:e.delegateActions.map(e=>({...e,actions:(0,n.nearActionsToConnectorActions)(e.actions)})),network:e.network??this.connector.network})}}t.InjectedWallet=o},8538:function(e,t,r){"use strict";var n=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.NearConnector=void 0;let o=r(8048),s=r(5658),a=r(1289),i=n(r(1361)),l=r(2101),c=r(6872),d=r(1883),u=["https://raw.githubusercontent.com/hot-dao/near-selector/refs/heads/main/repository/manifest.json","https://cdn.jsdelivr.net/gh/azbang/hot-connector/repository/manifest.json"];class h{storage;events;db;logger;wallets=[];manifest={wallets:[],version:"1.0.0"};features={};network="mainnet";providers={mainnet:[],testnet:[]};walletConnect;footerBranding;excludedWallets=[];autoConnect;whenManifestLoaded;constructor(e){this.db=new i.default("hot-connector","wallets"),this.storage=e?.storage??new a.LocalStorage,this.events=e?.events??new o.EventEmitter,this.logger=e?.logger,this.network=e?.network??"mainnet",this.walletConnect=e?.walletConnect,this.autoConnect=e?.autoConnect??!0,this.providers=e?.providers??{mainnet:[],testnet:[]},this.excludedWallets=e?.excludedWallets??[],this.features=e?.features??{},e?.footerBranding!==void 0?this.footerBranding=e?.footerBranding:this.footerBranding={icon:"https://pages.near.org/wp-content/uploads/2023/11/NEAR_token.png",heading:"NEAR Connector",link:"https://wallet.near.org",linkText:"Don't have a wallet?"},this.whenManifestLoaded=new Promise(async t=>{e?.manifest==null||"string"==typeof e.manifest?this.manifest=await this._loadManifest(e?.manifest).catch(()=>({wallets:[],version:"1.0.0"})):this.manifest=e?.manifest??{wallets:[],version:"1.0.0"};let r=new Set(this.excludedWallets);r.delete("hot-wallet"),this.manifest.wallets=this.manifest.wallets.filter(e=>!(e.permissions.walletConnect&&!this.walletConnect||r.has(e.id))),await new Promise(e=>setTimeout(e,100)),t()}),"undefined"!=typeof window&&(window.addEventListener("near-wallet-injected",this._handleNearWalletInjected),window.dispatchEvent(new Event("near-selector-ready")),window.addEventListener("message",async e=>{"near-wallet-injected"===e.data.type&&(await this.whenManifestLoaded.catch(()=>{}),this.wallets=this.wallets.filter(t=>t.manifest.id!==e.data.manifest.id),this.wallets.unshift(new l.ParentFrameWallet(this,e.data.manifest)),this.events.emit("selector:walletsChanged",{}),this.autoConnect&&this.connect({walletId:e.data.manifest.id}))})),this.whenManifestLoaded.then(()=>{"undefined"!=typeof window&&window.parent.postMessage({type:"near-selector-ready"},"*"),this.manifest.wallets.forEach(e=>this.registerWallet(e)),this.storage.get("debug-wallets").then(e=>{JSON.parse(e??"[]").forEach(e=>this.registerDebugWallet(e))})})}get availableWallets(){return this.wallets.filter(e=>Object.entries(this.features).every(([t,r])=>!r||!!e.manifest.features?.[t])).filter(e=>!!("testnet"!==this.network||e.manifest.features?.testnet))}_handleNearWalletInjected=e=>{this.wallets=this.wallets.filter(t=>t.manifest.id!==e.detail.manifest.id),this.wallets.unshift(new c.InjectedWallet(this,e.detail)),this.events.emit("selector:walletsChanged",{})};async _loadManifest(e){for(let t of e?[e]:u){let e=await fetch(t).catch(()=>null);if(e&&e.ok)return await e.json()}throw Error("Failed to load manifest")}async switchNetwork(e,t){this.network!==e&&(await this.disconnect().catch(()=>{}),this.network=e,await this.connect(t))}async registerWallet(e){if("sandbox"!==e.type)throw Error("Only sandbox wallets are supported");this.wallets.find(t=>t.manifest.id===e.id)||(this.wallets.push(new d.SandboxWallet(this,e)),this.events.emit("selector:walletsChanged",{}))}async registerDebugWallet(e){let t="string"==typeof e?JSON.parse(e):e;if("sandbox"!==t.type)throw Error("Only sandbox wallets type are supported");if(!t.id)throw Error("Manifest must have an id");if(!t.name)throw Error("Manifest must have a name");if(!t.icon)throw Error("Manifest must have an icon");if(!t.website)throw Error("Manifest must have a website");if(!t.version)throw Error("Manifest must have a version");if(!t.executor)throw Error("Manifest must have an executor");if(!t.features)throw Error("Manifest must have features");if(!t.permissions)throw Error("Manifest must have permissions");if(this.wallets.find(e=>e.manifest.id===t.id))throw Error("Wallet already registered");t.debug=!0,this.wallets.unshift(new d.SandboxWallet(this,t)),this.events.emit("selector:walletsChanged",{});let r=this.wallets.filter(e=>e.manifest.debug).map(e=>e.manifest);return this.storage.set("debug-wallets",JSON.stringify(r)),t}async removeDebugWallet(e){this.wallets=this.wallets.filter(t=>t.manifest.id!==e);let t=this.wallets.filter(e=>e.manifest.debug).map(e=>e.manifest);this.storage.set("debug-wallets",JSON.stringify(t)),this.events.emit("selector:walletsChanged",{})}async selectWallet({features:e={}}={}){return await this.whenManifestLoaded.catch(()=>{}),new Promise((t,r)=>{let n=new s.NearWalletsPopup({footer:this.footerBranding,wallets:this.availableWallets.filter(t=>0===Object.entries(e).length||Object.entries(e).filter(([e,t])=>!0===t).every(([e])=>t.manifest.features?.[e]===!0)).map(e=>e.manifest),onRemoveDebugManifest:async e=>this.removeDebugWallet(e),onAddDebugManifest:async e=>this.registerDebugWallet(e),onReject:()=>(r(Error("User rejected")),n.destroy()),onSelect:e=>(t(e),n.destroy())});n.create()})}async connect(e={}){let t=e.walletId,r=e.signMessageParams;await this.whenManifestLoaded.catch(()=>{}),t||(t=await this.selectWallet({features:{signInAndSignMessage:null!=e.signMessageParams||void 0,signInWithFunctionCallKey:null!=e.addFunctionCallKey||void 0}}));try{let n;let o=await this.wallet(t);if(this.logger?.log("Wallet available to connect",o),await this.storage.set("selected-wallet",t),this.logger?.log(`Set preferred wallet, try to signIn${null!=r?" (with signed message)":""}`,t),null!=e.addFunctionCallKey&&(this.logger?.log("Adding function call access key during sign in with params",e.addFunctionCallKey),n={...e.addFunctionCallKey,gasAllowance:e.addFunctionCallKey.gasAllowance??{amount:"250000000000000000000000",kind:"limited"}}),null!=r){let e=await o.signInAndSignMessage({addFunctionCallKey:n,messageParams:r,network:this.network});if(!e?.length)throw Error("Failed to sign in");this.logger?.log("Signed in to wallet (with signed message)",t,e),this.events.emit("wallet:signInAndSignMessage",{wallet:o,accounts:e,success:!0}),this.events.emit("wallet:signIn",{wallet:o,accounts:e.map(e=>({accountId:e.accountId,publicKey:e.publicKey})),success:!0,source:"signInAndSignMessage"})}else{let e=await o.signIn({addFunctionCallKey:n,network:this.network});if(!e?.length)throw Error("Failed to sign in");this.logger?.log("Signed in to wallet",t,e),this.events.emit("wallet:signIn",{wallet:o,accounts:e,success:!0,source:"signIn"})}return o}catch(e){throw this.logger?.log("Failed to connect to wallet",e),e}}async disconnect(e){e||(e=await this.wallet()),await e.signOut({network:this.network}),await this.storage.remove("selected-wallet"),this.events.emit("wallet:signOut",{success:!0})}async getConnectedWallet(){await this.whenManifestLoaded.catch(()=>{});let e=await this.storage.get("selected-wallet"),t=this.wallets.find(t=>t.manifest.id===e);if(!t)throw Error("No wallet selected");let r=await t.getAccounts();if(!r?.length)throw Error("No accounts found");return{wallet:t,accounts:r}}async wallet(e){if(await this.whenManifestLoaded.catch(()=>{}),!e)return this.getConnectedWallet().then(({wallet:e})=>e).catch(async()=>{throw await this.storage.remove("selected-wallet"),Error("No accounts found")});let t=this.wallets.find(t=>t.manifest.id===e);if(!t)throw Error("Wallet not found");return t}async use(e){await this.whenManifestLoaded.catch(()=>{}),this.wallets=this.wallets.map(t=>new Proxy(t,{get(t,r,n){let o=Reflect.get(t,r,n);if(r in e&&"function"==typeof o){let n=e[r];return function(...e){let r=()=>o.apply(t,e);return e.length>0?n.call(this,...e,r):n.call(this,void 0,r)}}return o}}))}on(e,t){this.events.on(e,t)}once(e,t){this.events.once(e,t)}off(e,t){this.events.off(e,t)}removeAllListeners(e){this.events.removeAllListeners(e)}}t.NearConnector=h},2101:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.ParentFrameWallet=void 0;let n=r(2428),o=r(9749);class s{connector;manifest;constructor(e,t){this.connector=e,this.manifest=t}callParentFrame(e,t){let r=(0,o.uuid4)();return window.parent.postMessage({type:"near-wallet-injected-request",id:r,method:e,params:t},"*"),new Promise((e,t)=>{let n=o=>{"near-wallet-injected-response"===o.data.type&&o.data.id===r&&(window.removeEventListener("message",n),o.data.success?e(o.data.result):t(o.data.error))};window.addEventListener("message",n)})}async signIn(e){let t=await this.callParentFrame("near:signIn",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey});return Array.isArray(t)?t:[t]}async signInAndSignMessage(e){let t=await this.callParentFrame("near:signInAndSignMessage",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey,messageParams:e.messageParams});return Array.isArray(t)?t:[t]}async signOut(e){let t={...e,network:e?.network??this.connector.network};await this.callParentFrame("near:signOut",t)}async getAccounts(e){let t={...e,network:e?.network??this.connector.network};return this.callParentFrame("near:getAccounts",t)}async signAndSendTransaction(e){let t=(0,n.nearActionsToConnectorActions)(e.actions),r={...e,actions:t,network:e.network??this.connector.network};return this.callParentFrame("near:signAndSendTransaction",r)}async signAndSendTransactions(e){let t={...e,network:e.network??this.connector.network};return t.transactions=t.transactions.map(e=>({actions:(0,n.nearActionsToConnectorActions)(e.actions),receiverId:e.receiverId})),this.callParentFrame("near:signAndSendTransactions",t)}async signMessage(e){let t={...e,network:e.network??this.connector.network};return this.callParentFrame("near:signMessage",t)}async signDelegateActions(e){let t={...e,delegateActions:e.delegateActions.map(e=>({...e,actions:(0,n.nearActionsToConnectorActions)(e.actions)})),network:e.network||this.connector.network};return this.callParentFrame("near:signDelegateActions",t)}}t.ParentFrameWallet=s},496:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0});let n=r(3168);async function o(e){let t=await e.executor.getAllStorage(),r=e.executor.connector.providers,o=e.executor.manifest,s=e.id,a=e.code.replaceAll(".localStorage",".sandboxedLocalStorage").replaceAll("window.top","window.selector").replaceAll("window.open","window.selector.open");return`
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
      <div id="root"></div>

      <style>
        :root {
          --background-color: rgb(40, 40, 40);
          --text-color: rgb(255, 255, 255);
          --border-color: rgb(209, 209, 209);
        }

        * {
          font-family: system-ui, Avenir, Helvetica, Arial, sans-serif
        }

        body, html {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          background-color: var(--background-color);
          color: var(--text-color);
        }

        #root {
          display: none;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          width: 100vw;
          background: radial-gradient(circle at center, #2c2c2c 0%, #1a1a1a 100%);
          text-align: center;
        }

        #root * {
          box-sizing: border-box;
          font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
          line-height: 1.5;
          color-scheme: light dark;
          color: rgb(255, 255, 255);
          font-synthesis: none;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
        }

        .prompt-container img {
          width: 100px;
          height: 100px;
          object-fit: cover;
          border-radius: 12px;
        }

        .prompt-container h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          margin-top: 16px;
        }

        .prompt-container p {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
          color: rgb(209, 209, 209);
        }

        .prompt-container button {
          background-color: #131313;
          border: none;
          border-radius: 12px;
          padding: 12px 24px;
          cursor: pointer;
          transition: border-color 0.25s;
          color: #fff;
          outline: none;
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          margin-top: 16px;
        }
      </style>


      <script>
      window.sandboxedLocalStorage = (() => {
        let storage = ${JSON.stringify(t)}

        return {
          setItem: function(key, value) {
            window.selector.storage.set(key, value)
            storage[key] = value || '';
          },
          getItem: function(key) {
            return key in storage ? storage[key] : null;
          },
          removeItem: function(key) {
            window.selector.storage.remove(key)
            delete storage[key];
          },
          get length() {
            return Object.keys(storage).length;
          },
          key: function(i) {
            const keys = Object.keys(storage);
            return keys[i] || null;
          },
        };
      })();

      const showPrompt = async (args) => {
        const root = document.getElementById("root");   
        root.style.display = "flex";
        root.innerHTML = \`
          <div class="prompt-container">
            <img src="${o.icon}" />
            <h1>${o.name}</h1>
            <p>\${args.title}</p>
            <button>\${args.button}</button>
          </div>
        \`;

        return new Promise((resolve) => {
          root.querySelector("button")?.addEventListener("click", () => {
            root.innerHTML = "";
            resolve(true);
          });
        });
      }

      class ProxyWindow {
        constructor(url, features) {
          this.closed = false;
          this.windowIdPromise = window.selector.call("open", { url, features });

          window.addEventListener("message", async (event) => {            
            if (event.data.origin !== "${s}") return;
            if (!event.data.method?.startsWith("proxy-window:")) return;
            const method = event.data.method.replace("proxy-window:", "");
            if (method === "closed" && event.data.windowId === await this.id()) this.closed = true;
          });
        } 

        async id() {
          return await this.windowIdPromise;
        }

        async focus() {
          await window.selector.call("panel.focus", { windowId: await this.id() });
        }

        async postMessage(data) {
          window.selector.call("panel.postMessage", { windowId: await this.id(), data });
        }

        async close() {
          await window.selector.call("panel.close", { windowId: await this.id() });
        }
      }

      window.selector = {
        wallet: null,
        location: "${window.location.href}",
        nearConnectVersion: "${n.NEAR_CONNECT_VERSION}",
        
        outerHeight: ${window.outerHeight},
        screenY: ${window.screenY},
        outerWidth: ${window.outerWidth},
        screenX: ${window.screenX},

        providers: {
          mainnet: ${JSON.stringify(r.mainnet)},
          testnet: ${JSON.stringify(r.testnet)},
        },

        uuid() {
          return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
        },

        walletConnect: {
          connect(params) {
            return window.selector.call("walletConnect.connect", params);
          },
          disconnect(params) {
            return window.selector.call("walletConnect.disconnect", params);
          },
          request(params) {
            return window.selector.call("walletConnect.request", params);
          },
          getProjectId() {
            return window.selector.call("walletConnect.getProjectId", {});
          },
          getSession() {
            return window.selector.call("walletConnect.getSession", {});
          },
        },
      
        async ready(wallet) {
          window.parent.postMessage({ method: "wallet-ready", origin: "${s}" }, "*");
          window.selector.wallet = wallet;
        },

        async call(method, params) {
          const id = window.selector.uuid();
          window.parent.postMessage({ method, params, id, origin: "${s}" }, "*");

          return new Promise((resolve, reject) => {
            const handler = (event) => {
              if (event.data.id !== id || event.data.origin !== "${s}") return;
              window.removeEventListener("message", handler);

              if (event.data.status === "failed") reject(event.data.result);
              else resolve(event.data.result);
            };

            window.addEventListener("message", handler);
          });
        },

        panelClosed(windowId) {
          window.parent.postMessage({ 
            method: "panel.closed", 
            origin: "${s}", 
            result: { windowId } 
          }, "*");
        },

        open(url, _, params) {
          return new ProxyWindow(url, params)
        },

        external(entity, key, ...args) {
          return window.selector.call("external", { entity, key, args: args || [] });
        },

        openNativeApp(url) {
          return window.selector.call("open.nativeApp", { url });
        },

        ui: {
          async whenApprove(options) {
            window.selector.ui.showIframe();
            await showPrompt(options);
            window.selector.ui.hideIframe();
          },

          async showIframe() {
            return await window.selector.call("ui.showIframe");
          },

          async hideIframe() {
            return await window.selector.call("ui.hideIframe");
          },
        },

        storage: {
          async set(key, value) {
            await window.selector.call("storage.set", { key, value });
          },
      
          async get(key) {
            return await window.selector.call("storage.get", { key });
          },
      
          async remove(key) {
            await window.selector.call("storage.remove", { key });
          },

          async keys() {
            return await window.selector.call("storage.keys", {});
          },
        },
      };

      window.addEventListener("message", async (event) => {
        if (event.data.origin !== "${s}") return;
        if (!event.data.method?.startsWith("wallet:")) return;
      
        const wallet = window.selector.wallet;
        const method = event.data.method.replace("wallet:", "");
        const payload = { id: event.data.id, origin: "${s}", method };
      
        if (wallet == null || typeof wallet[method] !== "function") {
          const data = { ...payload, status: "failed", result: "Method not found" };
          window.parent.postMessage(data, "*");
          return;
        }
        
        try {
          const result = await wallet[method](event.data.params);
          window.parent.postMessage({ ...payload, status: "success", result }, "*");
        } catch (error) {
          const data = { ...payload, status: "failed", result: error };
          window.parent.postMessage(data, "*");
        }
      });
      </script>

      <script type="module">${a}</script>
    </body>
  </html>
    `}t.default=o},8023:function(e,t,r){"use strict";var n=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0});let o=r(7987),s=r(9749),a=n(r(8037)),i=(0,s.uuid4)();class l{connector;manifest;activePanels={};storageSpace;constructor(e,t){this.connector=e,this.manifest=t,this.storageSpace=t.id}checkPermissions(e,t){if("walletConnect"===e)return!!this.manifest.permissions.walletConnect;if("external"===e){let e=this.manifest.permissions.external;return!!(e&&t?.entity)&&e.includes(t.entity)}if("allowsOpen"===e){let e=(0,o.parseUrl)(t?.url||""),r=this.manifest.permissions.allowsOpen;return!!(e&&r&&Array.isArray(r))&&0!==r.length&&r.some(t=>{let r=(0,o.parseUrl)(t);return!!r&&e.protocol===r.protocol&&(!r.hostname||e.hostname===r.hostname)&&(!r.pathname||"/"===r.pathname||e.pathname===r.pathname)})}return this.manifest.permissions[e]}assertPermissions(e,t,r){if(!this.checkPermissions(t,r.data.params))throw e.postMessage({...r.data,status:"failed",result:"Permission denied"}),Error("Permission denied")}_onMessage=async(e,t)=>{let r=r=>{e.postMessage({...t.data,status:"success",result:r})},n=r=>{e.postMessage({...t.data,status:"failed",result:r})};if("ui.showIframe"===t.data.method){e.show(),r(null);return}if("ui.hideIframe"===t.data.method){e.hide(),r(null);return}if("storage.set"===t.data.method){this.assertPermissions(e,"storage",t),localStorage.setItem(`${this.storageSpace}:${t.data.params.key}`,t.data.params.value),r(null);return}if("storage.get"===t.data.method){this.assertPermissions(e,"storage",t),r(localStorage.getItem(`${this.storageSpace}:${t.data.params.key}`));return}if("storage.keys"===t.data.method){this.assertPermissions(e,"storage",t),r(Object.keys(localStorage).filter(e=>e.startsWith(`${this.storageSpace}:`)));return}if("storage.remove"===t.data.method){this.assertPermissions(e,"storage",t),localStorage.removeItem(`${this.storageSpace}:${t.data.params.key}`),r(null);return}if("panel.focus"===t.data.method){let e=this.activePanels[t.data.params.windowId];e&&e.focus(),r(null);return}if("panel.postMessage"===t.data.method){let e=this.activePanels[t.data.params.windowId];e&&e.postMessage(t.data.params.data,"*"),r(null);return}if("panel.close"===t.data.method){let e=this.activePanels[t.data.params.windowId];e&&e.close(),delete this.activePanels[t.data.params.windowId],r(null);return}if("walletConnect.connect"===t.data.method){this.assertPermissions(e,"walletConnect",t);try{if(!this.connector.walletConnect)throw Error("WalletConnect is not configured");let e=await this.connector.walletConnect,n=await e.connect(t.data.params);n.approval(),r({uri:n.uri})}catch(e){n(e)}return}if("walletConnect.getProjectId"===t.data.method){if(!this.connector.walletConnect)throw Error("WalletConnect is not configured");this.assertPermissions(e,"walletConnect",t),r((await this.connector.walletConnect).core.projectId);return}if("walletConnect.disconnect"===t.data.method){this.assertPermissions(e,"walletConnect",t);try{if(!this.connector.walletConnect)throw Error("WalletConnect is not configured");let e=await this.connector.walletConnect,n=await e.disconnect(t.data.params);r(n)}catch(e){n(e)}return}if("walletConnect.getSession"===t.data.method){this.assertPermissions(e,"walletConnect",t);try{if(!this.connector.walletConnect)throw Error("WalletConnect is not configured");let e=await this.connector.walletConnect,t=e.session.keys[e.session.keys.length-1],n=t?e.session.get(t):null;r(n?{topic:n.topic,namespaces:n.namespaces}:null)}catch(e){n(e)}return}if("walletConnect.request"===t.data.method){this.assertPermissions(e,"walletConnect",t);try{if(!this.connector.walletConnect)throw Error("WalletConnect is not configured");let e=await this.connector.walletConnect,n=await e.request(t.data.params);r(n)}catch(e){n(e)}return}if("external"===t.data.method){this.assertPermissions(e,"external",t);try{let{entity:e,key:n,args:o}=t.data.params,s=e.split(".").reduce((e,t)=>e[t],window);"nightly.near"===e&&"signTransaction"===n&&(o[0].encode=()=>o[0]);let a="function"==typeof s[n]?await s[n](...o||[]):s[n];r(a)}catch(e){n(e)}return}if("open"===t.data.method){this.assertPermissions(e,"allowsOpen",t);let n="undefined"!=typeof window?window?.Telegram?.WebApp:null;if(n&&t.data.params.url.startsWith("https://t.me")){n.openTelegramLink(t.data.params.url);return}let a=window.open(t.data.params.url,"_blank",t.data.params.features),i=a?(0,s.uuid4)():null,l=r=>{let n=(0,o.parseUrl)(t.data.params.url);n&&n.origin===r.origin&&e.postMessage(r.data)};if(r(i),window.addEventListener("message",l),a&&i){this.activePanels[i]=a;let t=setInterval(()=>{if(a?.closed){window.removeEventListener("message",l),delete this.activePanels[i],clearInterval(t);try{e.postMessage({method:"proxy-window:closed",windowId:i})}catch{}}},500)}return}if("open.nativeApp"===t.data.method){this.assertPermissions(e,"allowsOpen",t);let r=(0,o.parseUrl)(t.data.params.url);if(!r||["https","http","javascript:","file:","data:","blob:","about:"].includes(r.protocol))throw n("Invalid URL"),Error("[open.nativeApp] Invalid URL");let s=document.createElement("iframe");s.src=t.data.params.url,s.style.display="none",document.body.appendChild(s),e.postMessage({...t.data,status:"success",result:null});return}};actualCode=null;async checkNewVersion(e,t){if(this.actualCode)return this.connector.logger?.log("New version of code already checked"),this.actualCode;let r=(0,o.parseUrl)(e.manifest.executor);if(r||(r=(0,o.parseUrl)(location.origin+e.manifest.executor)),!r)throw Error("Invalid executor URL");r.searchParams.set("nonce",i);let n=await fetch(r.toString()).then(e=>e.text());return(this.connector.logger?.log("New version of code fetched"),this.actualCode=n,n===t)?(this.connector.logger?.log("New version of code is the same as the current version"),this.actualCode):(await this.connector.db.setItem(`${this.manifest.id}:${this.manifest.version}`,n),this.connector.logger?.log("New version of code saved to cache"),n)}async loadCode(){let e=await this.connector.db.getItem(`${this.manifest.id}:${this.manifest.version}`).catch(()=>null);this.connector.logger?.log("Code loaded from cache",null!==e);let t=this.checkNewVersion(this,e);return e||await t}async call(e,t){this.connector.logger?.log("Add to queue",e,t),this.connector.logger?.log("Calling method",e,t);let r=await this.loadCode();this.connector.logger?.log("Code loaded, preparing");let n=new a.default(this,r,this._onMessage);this.connector.logger?.log("Code loaded, iframe initialized"),await n.readyPromise,this.connector.logger?.log("Iframe ready");let o=(0,s.uuid4)();return new Promise((r,s)=>{try{let a=i=>{i.data.id===o&&i.data.origin===n.origin&&(n.dispose(),window.removeEventListener("message",a),this.connector.logger?.log("postMessage",{result:i.data,request:{method:e,params:t}}),"failed"===i.data.status?s(i.data.result):r(i.data.result))};window.addEventListener("message",a),n.postMessage({method:e,params:t,id:o}),n.on("close",()=>s(Error("Wallet closed")))}catch(e){this.connector.logger?.log("Iframe error",e),s(e)}})}async getAllStorage(){let e=Object.keys(localStorage).filter(e=>e.startsWith(`${this.storageSpace}:`)),t={};for(let r of e)t[r.replace(`${this.storageSpace}:`,"")]=localStorage.getItem(r);return t}async clearStorage(){for(let e of Object.keys(localStorage).filter(e=>e.startsWith(`${this.storageSpace}:`)))localStorage.removeItem(e)}}t.default=l},8037:function(e,t,r){"use strict";var n=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0});let o=r(8048),s=r(9749),a=r(5939),i=n(r(496));class l{executor;origin;iframe=document.createElement("iframe");events=new o.EventEmitter;popup;handler;readyPromiseResolve;readyPromise=new Promise(e=>{this.readyPromiseResolve=e});constructor(e,t,r){this.executor=e,this.origin=(0,s.uuid4)(),this.handler=e=>{e.data.origin===this.origin&&("wallet-ready"===e.data.method&&this.readyPromiseResolve(),r(this,e))},window.addEventListener("message",this.handler);let n=[];this.executor.checkPermissions("usb")&&n.push("usb *;"),this.executor.checkPermissions("hid")&&n.push("hid *;"),this.executor.checkPermissions("clipboardRead")&&n.push("clipboard-read;"),this.executor.checkPermissions("clipboardWrite")&&n.push("clipboard-write;"),this.executor.checkPermissions("bluetooth")&&n.push("bluetooth *;"),this.iframe.allow=n.join(" "),this.iframe.setAttribute("sandbox","allow-scripts"),(0,i.default)({id:this.origin,executor:this.executor,code:t}).then(e=>{this.executor.connector.logger?.log("Iframe code injected"),this.iframe.srcdoc=e}),this.popup=new a.IframeWalletPopup({footer:this.executor.connector.footerBranding,iframe:this.iframe,onApprove:()=>{},onReject:()=>{window.removeEventListener("message",this.handler),this.events.emit("close",{}),this.popup.destroy()}}),this.popup.create()}on(e,t){this.events.on(e,t)}show(){this.popup.show()}hide(){this.popup.hide()}postMessage(e){if(!this.iframe.contentWindow)throw Error("Iframe not loaded");this.iframe.contentWindow.postMessage({...e,origin:this.origin},"*")}dispose(){window.removeEventListener("message",this.handler),this.popup.destroy()}}t.default=l},1883:function(e,t,r){"use strict";var n=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.SandboxWallet=void 0;let o=r(2428),s=n(r(8023));class a{connector;manifest;executor;constructor(e,t){this.connector=e,this.manifest=t,this.executor=new s.default(e,t)}async signIn(e){return this.executor.call("wallet:signIn",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey})}async signInAndSignMessage(e){return this.executor.call("wallet:signInAndSignMessage",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey,messageParams:e.messageParams})}async signOut(e){let t={...e,network:e?.network??this.connector.network};await this.executor.call("wallet:signOut",t),await this.executor.clearStorage()}async getAccounts(e){let t={...e,network:e?.network??this.connector.network};return this.executor.call("wallet:getAccounts",t)}async signAndSendTransaction(e){let t=(0,o.nearActionsToConnectorActions)(e.actions),r={...e,actions:t,network:e.network??this.connector.network};return this.executor.call("wallet:signAndSendTransaction",r)}async signAndSendTransactions(e){let t=e.transactions.map(e=>({actions:(0,o.nearActionsToConnectorActions)(e.actions),receiverId:e.receiverId})),r={...e,transactions:t,network:e.network??this.connector.network};return this.executor.call("wallet:signAndSendTransactions",r)}async signMessage(e){let t={...e,network:e.network??this.connector.network};return this.executor.call("wallet:signMessage",t)}async signDelegateActions(e){let t={...e,delegateActions:e.delegateActions.map(e=>({...e,actions:(0,o.nearActionsToConnectorActions)(e.actions)})),network:e.network??this.connector.network};return this.executor.call("wallet:signDelegateActions",t)}}t.SandboxWallet=a,t.default=a},2428:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.nearActionsToConnectorActions=void 0;let n=r(835),o=e=>{try{return JSON.parse(new TextDecoder().decode(e))}catch{return e}};t.nearActionsToConnectorActions=e=>e.map(e=>{if("type"in e)return e;if(e.functionCall)return{type:"FunctionCall",params:{methodName:e.functionCall.methodName,args:o(e.functionCall.args),gas:e.functionCall.gas.toString(),deposit:e.functionCall.deposit.toString()}};if(e.deployGlobalContract)return{type:"DeployGlobalContract",params:{code:e.deployGlobalContract.code,deployMode:e.deployGlobalContract.deployMode.AccountId?"AccountId":"CodeHash"}};if(e.createAccount)return{type:"CreateAccount"};if(e.useGlobalContract)return{type:"UseGlobalContract",params:{contractIdentifier:e.useGlobalContract.contractIdentifier.AccountId?{accountId:e.useGlobalContract.contractIdentifier.AccountId}:{codeHash:(0,n.encodeBase58)(e.useGlobalContract.contractIdentifier.CodeHash)}}};if(e.deployContract)return{type:"DeployContract",params:{code:e.deployContract.code}};if(e.deleteAccount)return{type:"DeleteAccount",params:{beneficiaryId:e.deleteAccount.beneficiaryId}};if(e.deleteKey)return{type:"DeleteKey",params:{publicKey:e.deleteKey.publicKey.toString()}};if(e.transfer)return{type:"Transfer",params:{deposit:e.transfer.deposit.toString()}};if(e.stake)return{type:"Stake",params:{stake:e.stake.stake.toString(),publicKey:e.stake.publicKey.toString()}};if(e.addKey)return{type:"AddKey",params:{publicKey:e.addKey.publicKey.toString(),accessKey:{nonce:Number(e.addKey.accessKey.nonce),permission:e.addKey.accessKey.permission.functionCall?{receiverId:e.addKey.accessKey.permission.functionCall.receiverId,allowance:e.addKey.accessKey.permission.functionCall.allowance?.toString(),methodNames:e.addKey.accessKey.permission.functionCall.methodNames}:"FullAccess"}}};throw Error("Unsupported action type")})},835:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.encodeBase58=function(e){if(0===e.length)return"";let t=0,n=0;for(;n<e.length&&0===e[n];)t++,n++;let o=[0];for(;n<e.length;n++){let t=e[n];for(let e=0;e<o.length;++e)t+=o[e]<<8,o[e]=t%58,t=t/58|0;for(;t>0;)o.push(t%58),t=t/58|0}for(;o.length>0&&0===o[o.length-1];)o.pop();let s="";for(let e=0;e<t;e++)s+=r[0];for(let e=o.length-1;e>=0;--e)s+=r[o[e]];return s};let r="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"},8048:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.EventEmitter=void 0;class r{events={};on(e,t){this.events[e]||(this.events[e]=[]),this.events[e].push(t)}emit(e,t){this.events[e]?.forEach(e=>e(t))}off(e,t){this.events[e]=this.events[e]?.filter(e=>e!==t)}once(e,t){let r=n=>{t(n),this.off(e,r)};this.on(e,r)}removeAllListeners(e){e?delete this.events[e]:this.events={}}}t.EventEmitter=r},9064:(e,t)=>{"use strict";function r(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}Object.defineProperty(t,"__esModule",{value:!0}),t.escapeHtml=r,t.html=function(e,...t){let o=e[0];for(let s=0;s<t.length;s++){for(let e of Array.isArray(t[s])?t[s]:[t[s]]){let t=e?.[n]?e[n]:r(String(e??""));o+=t}o+=e[s+1]}return Object.freeze({[n]:o,get html(){return o}})};let n=Symbol("htmlTag")},1361:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0});class r{dbName;storeName;version;constructor(e,t){this.dbName=e,this.storeName=t,this.version=1}getDb(){return new Promise((e,t)=>{if("undefined"==typeof window||"undefined"==typeof indexedDB){t(Error("IndexedDB is not available (SSR environment)"));return}let r=indexedDB.open(this.dbName,this.version);r.onerror=e=>{console.error("Error opening database:",e.target.error),t(Error("Error opening database"))},r.onsuccess=t=>{e(r.result)},r.onupgradeneeded=e=>{let t=r.result;t.objectStoreNames.contains(this.storeName)||t.createObjectStore(this.storeName)}})}async getItem(e){let t=await this.getDb();if("number"==typeof e&&(e=e.toString()),"string"!=typeof e)throw Error("Key must be a string");return new Promise((r,n)=>{if(!this.storeName){n(Error("Store name not set"));return}let o=t.transaction(this.storeName,"readonly");o.onerror=e=>n(o.error);let s=o.objectStore(this.storeName).get(e);s.onerror=e=>n(s.error),s.onsuccess=()=>{r(s.result),t.close()}})}async setItem(e,t){let r=await this.getDb();if("number"==typeof e&&(e=e.toString()),"string"!=typeof e)throw Error("Key must be a string");return new Promise((n,o)=>{if(!this.storeName){o(Error("Store name not set"));return}let s=r.transaction(this.storeName,"readwrite");s.onerror=e=>o(s.error);let a=s.objectStore(this.storeName).put(t,e);a.onerror=e=>o(a.error),a.onsuccess=()=>{r.close(),n()}})}async removeItem(e){let t=await this.getDb();if("number"==typeof e&&(e=e.toString()),"string"!=typeof e)throw Error("Key must be a string");return new Promise((r,n)=>{if(!this.storeName){n(Error("Store name not set"));return}let o=t.transaction(this.storeName,"readwrite");o.onerror=e=>n(o.error);let s=o.objectStore(this.storeName).delete(e);s.onerror=e=>n(s.error),s.onsuccess=()=>{t.close(),r()}})}async keys(){let e=await this.getDb();return new Promise((t,r)=>{if(!this.storeName){r(Error("Store name not set"));return}let n=e.transaction(this.storeName,"readonly");n.onerror=e=>r(n.error);let o=n.objectStore(this.storeName).getAllKeys();o.onerror=e=>r(o.error),o.onsuccess=()=>{t(o.result),e.close()}})}async count(){let e=await this.getDb();return new Promise((t,r)=>{if(!this.storeName){r(Error("Store name not set"));return}let n=e.transaction(this.storeName,"readonly");n.onerror=e=>r(n.error);let o=n.objectStore(this.storeName).count();o.onerror=e=>r(o.error),o.onsuccess=()=>{t(o.result),e.close()}})}async length(){return this.count()}async clear(){let e=await this.getDb();return new Promise((t,r)=>{if(!this.storeName){r(Error("Store name not set"));return}let n=e.transaction(this.storeName,"readwrite");n.onerror=e=>r(n.error);let o=n.objectStore(this.storeName).clear();o.onerror=e=>r(o.error),o.onsuccess=()=>{e.close(),t()}})}}t.default=r},1289:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.LocalStorage=void 0;class r{async get(e){return"undefined"==typeof window?null:localStorage.getItem(e)}async set(e,t){"undefined"!=typeof window&&localStorage.setItem(e,t)}async remove(e){"undefined"!=typeof window&&localStorage.removeItem(e)}}t.LocalStorage=r},7987:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.parseUrl=void 0,t.parseUrl=e=>{try{return new URL(e)}catch{return null}}},9749:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.uuid4=void 0,t.uuid4=()=>"undefined"!=typeof window&&void 0!==window.crypto&&"function"==typeof window.crypto.randomUUID?window.crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(e){let t=16*Math.random()|0;return("x"===e?t:3&t|8).toString(16)})},7022:(e,t,r)=>{"use strict";r(1289),r(2101),r(1883),r(6872),r(8538),r(2428)},3168:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.NEAR_CONNECT_VERSION=void 0,t.NEAR_CONNECT_VERSION="0.11.1"},5939:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.IframeWalletPopup=void 0;let n=r(9064),o=r(1629);class s extends o.Popup{delegate;constructor(e){super(e),this.delegate=e}handlers(){super.handlers(),this.addListener("button","click",()=>this.delegate.onApprove())}create(){super.create({show:!1}),this.root.querySelector(".modal-body").appendChild(this.delegate.iframe),this.delegate.iframe.style.width="100%",this.delegate.iframe.style.height="720px",this.delegate.iframe.style.border="none"}get footer(){if(!this.delegate.footer)return"";let{icon:e,heading:t}=this.delegate.footer;return(0,n.html)`
      <div class="footer">
        ${e?(0,n.html)`<img src="${e}" alt="${t}" />`:""}
        <p>${t}</p>
      </div>
    `}get dom(){return(0,n.html)`<div class="modal-container">
      <div class="modal-content">
        <div class="modal-body" style="padding: 0; overflow: auto;"></div>
        ${this.footer}
      </div>
    </div>`}}t.IframeWalletPopup=s},5658:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.NearWalletsPopup=void 0;let n=r(9064),o=r(7987),s=r(1629),a={id:"custom-wallet",name:"Custom Wallet",icon:"https://www.mynearwallet.com/images/webclip.png",description:"Custom wallet for NEAR.",website:"",version:"1.0.0",executor:"your-executor-url.js",type:"sandbox",platform:{},features:{signMessage:!0,signInWithoutAddKey:!0,signInAndSignMessage:!0,signAndSendTransaction:!0,signAndSendTransactions:!0,signDelegateActions:!0},permissions:{storage:!0,allowsOpen:[]}};class i extends s.Popup{delegate;constructor(e){super(e),this.delegate=e,this.update({wallets:e.wallets,showSettings:!1})}handlers(){super.handlers(),this.addListener(".settings-button","click",()=>this.update({showSettings:!0})),this.addListener(".back-button","click",()=>this.update({showSettings:!1})),this.root.querySelectorAll(".connect-item").forEach(e=>{e instanceof HTMLDivElement&&this.addListener(e,"click",()=>this.delegate.onSelect(e.dataset.type))}),this.root.querySelectorAll(".remove-wallet-button").forEach(e=>{e instanceof SVGSVGElement&&this.addListener(e,"click",async t=>{t.stopPropagation(),await this.delegate.onRemoveDebugManifest(e.dataset.type);let r=this.state.wallets.filter(t=>t.id!==e.dataset.type);this.update({wallets:r})})}),this.addListener(".add-debug-manifest-button","click",async()=>{try{let e=this.root.querySelector("#debug-manifest-input")?.value??"",t=await this.delegate.onAddDebugManifest(e);this.update({showSettings:!1,wallets:[t,...this.state.wallets]})}catch(e){alert(`Something went wrong: ${e}`)}})}create(){super.create({show:!0})}walletDom(e){let t=(0,n.html)`
      <svg
        class="remove-wallet-button"
        data-type="${e.id}"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style="margin-right: 4px;"
      >
        <path d="M18 6L6 18" stroke="rgba(255,255,255,0.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M6 6L18 18" stroke="rgba(255,255,255,0.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;return(0,n.html)`
      <div class="connect-item" data-type="${e.id}">
        <img style="background: #333" src="${e.icon}" alt="${e.name}" />
        <div class="connect-item-info">
          <span>${e.name}</span>
          <span class="wallet-address">${o.parseUrl(e.website)?.hostname}</span>
        </div>
        ${e.debug?t:""}
      </div>
    `}get footer(){if(!this.delegate.footer)return"";let{icon:e,heading:t,link:r,linkText:o}=this.delegate.footer;return(0,n.html)`
      <div class="footer">
        ${e?(0,n.html)`<img src="${e}" alt="${t}" />`:""}
        <p>${t}</p>
        <a class="get-wallet-link" href="${r}" target="_blank">${o}</a>
      </div>
    `}get dom(){return this.state.showSettings?(0,n.html)`
        <div class="modal-container">
          <div class="modal-content">
            <div class="modal-header">
              <button class="back-button" style="left: 16px; right: unset;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="rgba(255,255,255,0.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <p>Settings</p>
            </div>

            <div class="modal-body">
              <p style="text-align: left;">
                You can add your wallet to dapp for debug,
                <a href="https://github.com/azbang/hot-connector" target="_blank">read the documentation.</a> Paste your manifest and click "Add".
              </p>

              <textarea style="width: 100%;" id="debug-manifest-input" rows="10">${JSON.stringify(a,null,2)}</textarea>
              <button class="add-debug-manifest-button">Add</button>
            </div>

            ${this.footer}
          </div>
        </div>
      `:(0,n.html)`<div class="modal-container">
      <div class="modal-content">
        <div class="modal-header">
          <p>Select wallet</p>
          <button class="settings-button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="2" fill="rgba(255,255,255,0.5)" />
              <circle cx="19" cy="12" r="2" fill="rgba(255,255,255,0.5)" />
              <circle cx="5" cy="12" r="2" fill="rgba(255,255,255,0.5)" />
            </svg>
          </button>
        </div>

        <div class="modal-body">${this.state.wallets.map(e=>this.walletDom(e))}</div>

        ${this.footer}
      </div>
    </div>`}}t.NearWalletsPopup=i},1629:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.Popup=void 0;let n=r(9226),o=r(9064),s=`n${Math.random().toString(36).substring(2,15)}`;if("undefined"!=typeof document){let e=document.createElement("style");e.textContent=(0,n.css)(`.${s}`),document.head.append(e)}class a{delegate;isClosed=!1;root=document.createElement("div");state={};constructor(e){this.delegate=e}get dom(){return(0,o.html)``}disposables=[];addListener(e,t,r){let n="string"==typeof e?this.root.querySelector(e):e;n&&(n.addEventListener(t,r),this.disposables.push(()=>n.removeEventListener(t,r)))}handlers(){this.disposables.forEach(e=>e()),this.disposables=[];let e=this.root.querySelector(".modal-container");this.root.querySelector(".modal-content").onclick=e=>e.stopPropagation(),e.onclick=()=>{this.delegate.onReject(),this.destroy()}}update(e){this.state={...this.state,...e},this.root.innerHTML=this.dom.html,this.handlers()}create({show:e=!0}){this.root.className=`${s} hot-connector-popup`,this.root.innerHTML=this.dom.html,document.body.append(this.root),this.handlers();let t=this.root.querySelector(".modal-container");this.root.querySelector(".modal-content").style.transform="translateY(50px)",t.style.opacity="0",this.root.style.display="none",e&&setTimeout(()=>this.show(),10)}show(){let e=this.root.querySelector(".modal-container"),t=this.root.querySelector(".modal-content");t.style.transform="translateY(50px)",e.style.opacity="0",this.root.style.display="block",setTimeout(()=>{t.style.transform="translateY(0)",e.style.opacity="1"},100)}hide(){let e=this.root.querySelector(".modal-container");this.root.querySelector(".modal-content").style.transform="translateY(50px)",e.style.opacity="0",setTimeout(()=>{this.root.style.display="none"},200)}destroy(){this.isClosed||(this.isClosed=!0,this.hide(),setTimeout(()=>{this.root.remove()},200))}}t.Popup=a},9226:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.css=void 0,t.css=e=>`
${e} * {
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  -ms-overflow-style: none; 
  scrollbar-width: none; 
  color: #fff;
}

${e} *::-webkit-scrollbar { 
  display: none;
}

${e} p,
${e} h1,
${e} h2,
${e} h3,
${e} h4,
${e} h5,
${e} h6 {
  margin: 0;
}

${e} .modal-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 100000000;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    transition: opacity 0.2s ease-in-out;
}

@media (max-width: 600px) {
  ${e} .modal-container {
    justify-content: flex-end;
  }
}

${e} .modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;

  max-width: 420px;
  max-height: 615px;
  width: 100%;
  border-radius: 24px;
  background: #0d0d0d;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.2s ease-in-out;
}

@media (max-width: 600px) {
  ${e} .modal-content {
    max-width: 100%;
    width: 100%;
    max-height: 80%;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border: none;
    border-top: 1.5px solid rgba(255, 255, 255, 0.1);
  }
}


${e} .modal-header {
  display: flex;
  padding: 16px;
  gap: 16px;
  align-self: stretch;
  align-items: center;
  justify-content: center;
  position: relative;
}

${e} .modal-header button {
  position: absolute;
  right: 16px;
  top: 16px;
  width: 32px;
  height: 32px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s ease-in-out;
  border: none;
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

${e} .modal-header button:hover {
  background: rgba(255, 255, 255, 0.04);
}
  
${e} .modal-header p {
  color: #fff;
  text-align: center;
  font-size: 24px;
  font-style: normal;
  font-weight: 600;
  line-height: normal;
  margin: 0;
}


${e} .modal-body {
  display: flex;
  padding: 16px;
  flex-direction: column;
  align-items: flex-start;
  text-align: center;
  gap: 8px;
  overflow: auto;

  border-radius: 24px;
  background: rgba(255, 255, 255, 0.08);
  width: 100%;
  flex: 1;
}

${e} .modal-body textarea {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  background: #0d0d0d;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  outline: none;
  font-size: 16px;
  transition: background 0.2s ease-in-out;
  font-family: monospace;
  font-size: 12px;
}

${e} .modal-body button {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  background: #fff;
  color: #000;
  border: none;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.2s ease-in-out;
  margin-top: 16px;
}

${e} .footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 16px 24px;
  color: #fff;
  gap: 12px;
}

${e} .modal-body p {
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: normal;
  letter-spacing: -0.8px;
}

${e} .footer img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

${e} .get-wallet-link {
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  margin-left: auto;
  text-decoration: none;
  transition: color 0.2s ease-in-out;
  cursor: pointer;
}
  
${e} .get-wallet-link:hover {
  color: rgba(255, 255, 255, 1);
}


${e} .connect-item {
  display: flex;
  padding: 8px;
  align-items: center;
  gap: 12px;
  align-self: stretch;
  cursor: pointer;

  transition: background 0.2s ease-in-out;
  border-radius: 24px;
}

${e} .connect-item img {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  object-fit: cover;
  flex-shrink: 0;
}

${e} .connect-item-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  text-align: left;
  flex: 1;
  margin-top: -2px;
}

${e} .connect-item-info .wallet-address {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
}

${e} .connect-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

${e} .connect-item img {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  object-fit: cover;
}

${e} .connect-item p {
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  font-size: 18px;
  font-style: normal;
  font-weight: 600;
  line-height: normal;
  letter-spacing: -0.36px;
  margin: 0;
}
`}};var t=require("../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),n=t.X(0,[734],()=>r(76));module.exports=n})();
(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[507],{357:function(e,t,n){"use strict";var r,o;e.exports=(null==(r=n.g.process)?void 0:r.env)&&"object"==typeof(null==(o=n.g.process)?void 0:o.env)?n.g.process:n(8081)},8081:function(e){!function(){var t={229:function(e){var t,n,r,o=e.exports={};function s(){throw Error("setTimeout has not been defined")}function a(){throw Error("clearTimeout has not been defined")}function i(e){if(t===setTimeout)return setTimeout(e,0);if((t===s||!t)&&setTimeout)return t=setTimeout,setTimeout(e,0);try{return t(e,0)}catch(n){try{return t.call(null,e,0)}catch(n){return t.call(this,e,0)}}}!function(){try{t="function"==typeof setTimeout?setTimeout:s}catch(e){t=s}try{n="function"==typeof clearTimeout?clearTimeout:a}catch(e){n=a}}();var l=[],c=!1,d=-1;function u(){c&&r&&(c=!1,r.length?l=r.concat(l):d=-1,l.length&&h())}function h(){if(!c){var e=i(u);c=!0;for(var t=l.length;t;){for(r=l,l=[];++d<t;)r&&r[d].run();d=-1,t=l.length}r=null,c=!1,function(e){if(n===clearTimeout)return clearTimeout(e);if((n===a||!n)&&clearTimeout)return n=clearTimeout,clearTimeout(e);try{n(e)}catch(t){try{return n.call(null,e)}catch(t){return n.call(this,e)}}}(e)}}function g(e,t){this.fun=e,this.array=t}function w(){}o.nextTick=function(e){var t=Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)t[n-1]=arguments[n];l.push(new g(e,t)),1!==l.length||c||i(h)},g.prototype.run=function(){this.fun.apply(null,this.array)},o.title="browser",o.browser=!0,o.env={},o.argv=[],o.version="",o.versions={},o.on=w,o.addListener=w,o.once=w,o.off=w,o.removeListener=w,o.removeAllListeners=w,o.emit=w,o.prependListener=w,o.prependOnceListener=w,o.listeners=function(e){return[]},o.binding=function(e){throw Error("process.binding is not supported")},o.cwd=function(){return"/"},o.chdir=function(e){throw Error("process.chdir is not supported")},o.umask=function(){return 0}}},n={};function r(e){var o=n[e];if(void 0!==o)return o.exports;var s=n[e]={exports:{}},a=!0;try{t[e](s,s.exports,r),a=!1}finally{a&&delete n[e]}return s.exports}r.ab="//";var o=r(229);e.exports=o}()},6387:function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.InjectedWallet=void 0;let r=n(6228);class o{connector;wallet;constructor(e,t){this.connector=e,this.wallet=t}get manifest(){return this.wallet.manifest}async signIn({addFunctionCallKey:e,network:t}){return this.wallet.signIn({network:t??this.connector.network,addFunctionCallKey:e})}async signInAndSignMessage(e){return this.wallet.signInAndSignMessage({network:e?.network??this.connector.network,addFunctionCallKey:e.addFunctionCallKey,messageParams:e.messageParams})}async signOut(e){await this.wallet.signOut({network:e?.network??this.connector.network})}async getAccounts(e){return this.wallet.getAccounts({network:e?.network??this.connector.network})}async signAndSendTransaction(e){let t=(0,r.nearActionsToConnectorActions)(e.actions),n=e.network??this.connector.network,o=await this.wallet.signAndSendTransaction({...e,actions:t,network:n});if(!o)throw Error("No result from wallet");return Array.isArray(o.transactions)?o.transactions[0]:o}async signAndSendTransactions(e){let t=e.network??this.connector.network,n=e.transactions.map(e=>({actions:(0,r.nearActionsToConnectorActions)(e.actions),receiverId:e.receiverId})),o=await this.wallet.signAndSendTransactions({...e,transactions:n,network:t});if(!o)throw Error("No result from wallet");return Array.isArray(o.transactions)?o.transactions:o}async signMessage(e){return this.wallet.signMessage({...e,network:e.network??this.connector.network})}async signDelegateActions(e){return this.wallet.signDelegateActions({...e,delegateActions:e.delegateActions.map(e=>({...e,actions:(0,r.nearActionsToConnectorActions)(e.actions)})),network:e.network??this.connector.network})}}t.InjectedWallet=o},9765:function(e,t,n){"use strict";var r=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.NearConnector=void 0;let o=n(9203),s=n(9523),a=n(4139),i=r(n(2001)),l=n(3793),c=n(6387),d=n(3070),u=["https://raw.githubusercontent.com/hot-dao/near-selector/refs/heads/main/repository/manifest.json","https://cdn.jsdelivr.net/gh/azbang/hot-connector/repository/manifest.json"];class h{storage;events;db;logger;wallets=[];manifest={wallets:[],version:"1.0.0"};features={};network="mainnet";providers={mainnet:[],testnet:[]};walletConnect;footerBranding;excludedWallets=[];autoConnect;whenManifestLoaded;constructor(e){this.db=new i.default("hot-connector","wallets"),this.storage=e?.storage??new a.LocalStorage,this.events=e?.events??new o.EventEmitter,this.logger=e?.logger,this.network=e?.network??"mainnet",this.walletConnect=e?.walletConnect,this.autoConnect=e?.autoConnect??!0,this.providers=e?.providers??{mainnet:[],testnet:[]},this.excludedWallets=e?.excludedWallets??[],this.features=e?.features??{},e?.footerBranding!==void 0?this.footerBranding=e?.footerBranding:this.footerBranding={icon:"https://pages.near.org/wp-content/uploads/2023/11/NEAR_token.png",heading:"NEAR Connector",link:"https://wallet.near.org",linkText:"Don't have a wallet?"},this.whenManifestLoaded=new Promise(async t=>{e?.manifest==null||"string"==typeof e.manifest?this.manifest=await this._loadManifest(e?.manifest).catch(()=>({wallets:[],version:"1.0.0"})):this.manifest=e?.manifest??{wallets:[],version:"1.0.0"};let n=new Set(this.excludedWallets);n.delete("hot-wallet"),this.manifest.wallets=this.manifest.wallets.filter(e=>!(e.permissions.walletConnect&&!this.walletConnect||n.has(e.id))),await new Promise(e=>setTimeout(e,100)),t()}),"undefined"!=typeof window&&(window.addEventListener("near-wallet-injected",this._handleNearWalletInjected),window.dispatchEvent(new Event("near-selector-ready")),window.addEventListener("message",async e=>{"near-wallet-injected"===e.data.type&&(await this.whenManifestLoaded.catch(()=>{}),this.wallets=this.wallets.filter(t=>t.manifest.id!==e.data.manifest.id),this.wallets.unshift(new l.ParentFrameWallet(this,e.data.manifest)),this.events.emit("selector:walletsChanged",{}),this.autoConnect&&this.connect({walletId:e.data.manifest.id}))})),this.whenManifestLoaded.then(()=>{"undefined"!=typeof window&&window.parent.postMessage({type:"near-selector-ready"},"*"),this.manifest.wallets.forEach(e=>this.registerWallet(e)),this.storage.get("debug-wallets").then(e=>{JSON.parse(e??"[]").forEach(e=>this.registerDebugWallet(e))})})}get availableWallets(){return this.wallets.filter(e=>Object.entries(this.features).every(([t,n])=>!n||!!e.manifest.features?.[t])).filter(e=>!!("testnet"!==this.network||e.manifest.features?.testnet))}_handleNearWalletInjected=e=>{this.wallets=this.wallets.filter(t=>t.manifest.id!==e.detail.manifest.id),this.wallets.unshift(new c.InjectedWallet(this,e.detail)),this.events.emit("selector:walletsChanged",{})};async _loadManifest(e){for(let t of e?[e]:u){let e=await fetch(t).catch(()=>null);if(e&&e.ok)return await e.json()}throw Error("Failed to load manifest")}async switchNetwork(e,t){this.network!==e&&(await this.disconnect().catch(()=>{}),this.network=e,await this.connect(t))}async registerWallet(e){if("sandbox"!==e.type)throw Error("Only sandbox wallets are supported");this.wallets.find(t=>t.manifest.id===e.id)||(this.wallets.push(new d.SandboxWallet(this,e)),this.events.emit("selector:walletsChanged",{}))}async registerDebugWallet(e){let t="string"==typeof e?JSON.parse(e):e;if("sandbox"!==t.type)throw Error("Only sandbox wallets type are supported");if(!t.id)throw Error("Manifest must have an id");if(!t.name)throw Error("Manifest must have a name");if(!t.icon)throw Error("Manifest must have an icon");if(!t.website)throw Error("Manifest must have a website");if(!t.version)throw Error("Manifest must have a version");if(!t.executor)throw Error("Manifest must have an executor");if(!t.features)throw Error("Manifest must have features");if(!t.permissions)throw Error("Manifest must have permissions");if(this.wallets.find(e=>e.manifest.id===t.id))throw Error("Wallet already registered");t.debug=!0,this.wallets.unshift(new d.SandboxWallet(this,t)),this.events.emit("selector:walletsChanged",{});let n=this.wallets.filter(e=>e.manifest.debug).map(e=>e.manifest);return this.storage.set("debug-wallets",JSON.stringify(n)),t}async removeDebugWallet(e){this.wallets=this.wallets.filter(t=>t.manifest.id!==e);let t=this.wallets.filter(e=>e.manifest.debug).map(e=>e.manifest);this.storage.set("debug-wallets",JSON.stringify(t)),this.events.emit("selector:walletsChanged",{})}async selectWallet({features:e={}}={}){return await this.whenManifestLoaded.catch(()=>{}),new Promise((t,n)=>{let r=new s.NearWalletsPopup({footer:this.footerBranding,wallets:this.availableWallets.filter(t=>0===Object.entries(e).length||Object.entries(e).filter(([e,t])=>!0===t).every(([e])=>t.manifest.features?.[e]===!0)).map(e=>e.manifest),onRemoveDebugManifest:async e=>this.removeDebugWallet(e),onAddDebugManifest:async e=>this.registerDebugWallet(e),onReject:()=>(n(Error("User rejected")),r.destroy()),onSelect:e=>(t(e),r.destroy())});r.create()})}async connect(e={}){let t=e.walletId,n=e.signMessageParams;await this.whenManifestLoaded.catch(()=>{}),t||(t=await this.selectWallet({features:{signInAndSignMessage:null!=e.signMessageParams||void 0,signInWithFunctionCallKey:null!=e.addFunctionCallKey||void 0}}));try{let r;let o=await this.wallet(t);if(this.logger?.log("Wallet available to connect",o),await this.storage.set("selected-wallet",t),this.logger?.log(`Set preferred wallet, try to signIn${null!=n?" (with signed message)":""}`,t),null!=e.addFunctionCallKey&&(this.logger?.log("Adding function call access key during sign in with params",e.addFunctionCallKey),r={...e.addFunctionCallKey,gasAllowance:e.addFunctionCallKey.gasAllowance??{amount:"250000000000000000000000",kind:"limited"}}),null!=n){let e=await o.signInAndSignMessage({addFunctionCallKey:r,messageParams:n,network:this.network});if(!e?.length)throw Error("Failed to sign in");this.logger?.log("Signed in to wallet (with signed message)",t,e),this.events.emit("wallet:signInAndSignMessage",{wallet:o,accounts:e,success:!0}),this.events.emit("wallet:signIn",{wallet:o,accounts:e.map(e=>({accountId:e.accountId,publicKey:e.publicKey})),success:!0,source:"signInAndSignMessage"})}else{let e=await o.signIn({addFunctionCallKey:r,network:this.network});if(!e?.length)throw Error("Failed to sign in");this.logger?.log("Signed in to wallet",t,e),this.events.emit("wallet:signIn",{wallet:o,accounts:e,success:!0,source:"signIn"})}return o}catch(e){throw this.logger?.log("Failed to connect to wallet",e),e}}async disconnect(e){e||(e=await this.wallet()),await e.signOut({network:this.network}),await this.storage.remove("selected-wallet"),this.events.emit("wallet:signOut",{success:!0})}async getConnectedWallet(){await this.whenManifestLoaded.catch(()=>{});let e=await this.storage.get("selected-wallet"),t=this.wallets.find(t=>t.manifest.id===e);if(!t)throw Error("No wallet selected");let n=await t.getAccounts();if(!n?.length)throw Error("No accounts found");return{wallet:t,accounts:n}}async wallet(e){if(await this.whenManifestLoaded.catch(()=>{}),!e)return this.getConnectedWallet().then(({wallet:e})=>e).catch(async()=>{throw await this.storage.remove("selected-wallet"),Error("No accounts found")});let t=this.wallets.find(t=>t.manifest.id===e);if(!t)throw Error("Wallet not found");return t}async use(e){await this.whenManifestLoaded.catch(()=>{}),this.wallets=this.wallets.map(t=>new Proxy(t,{get(t,n,r){let o=Reflect.get(t,n,r);if(n in e&&"function"==typeof o){let r=e[n];return function(...e){let n=()=>o.apply(t,e);return e.length>0?r.call(this,...e,n):r.call(this,void 0,n)}}return o}}))}on(e,t){this.events.on(e,t)}once(e,t){this.events.once(e,t)}off(e,t){this.events.off(e,t)}removeAllListeners(e){this.events.removeAllListeners(e)}}t.NearConnector=h},3793:function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.ParentFrameWallet=void 0;let r=n(6228),o=n(1017);class s{connector;manifest;constructor(e,t){this.connector=e,this.manifest=t}callParentFrame(e,t){let n=(0,o.uuid4)();return window.parent.postMessage({type:"near-wallet-injected-request",id:n,method:e,params:t},"*"),new Promise((e,t)=>{let r=o=>{"near-wallet-injected-response"===o.data.type&&o.data.id===n&&(window.removeEventListener("message",r),o.data.success?e(o.data.result):t(o.data.error))};window.addEventListener("message",r)})}async signIn(e){let t=await this.callParentFrame("near:signIn",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey});return Array.isArray(t)?t:[t]}async signInAndSignMessage(e){let t=await this.callParentFrame("near:signInAndSignMessage",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey,messageParams:e.messageParams});return Array.isArray(t)?t:[t]}async signOut(e){let t={...e,network:e?.network??this.connector.network};await this.callParentFrame("near:signOut",t)}async getAccounts(e){let t={...e,network:e?.network??this.connector.network};return this.callParentFrame("near:getAccounts",t)}async signAndSendTransaction(e){let t=(0,r.nearActionsToConnectorActions)(e.actions),n={...e,actions:t,network:e.network??this.connector.network};return this.callParentFrame("near:signAndSendTransaction",n)}async signAndSendTransactions(e){let t={...e,network:e.network??this.connector.network};return t.transactions=t.transactions.map(e=>({actions:(0,r.nearActionsToConnectorActions)(e.actions),receiverId:e.receiverId})),this.callParentFrame("near:signAndSendTransactions",t)}async signMessage(e){let t={...e,network:e.network??this.connector.network};return this.callParentFrame("near:signMessage",t)}async signDelegateActions(e){let t={...e,delegateActions:e.delegateActions.map(e=>({...e,actions:(0,r.nearActionsToConnectorActions)(e.actions)})),network:e.network||this.connector.network};return this.callParentFrame("near:signDelegateActions",t)}}t.ParentFrameWallet=s},9391:function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0});let r=n(3688);async function o(e){let t=await e.executor.getAllStorage(),n=e.executor.connector.providers,o=e.executor.manifest,s=e.id,a=e.code.replaceAll(".localStorage",".sandboxedLocalStorage").replaceAll("window.top","window.selector").replaceAll("window.open","window.selector.open");return`
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
        nearConnectVersion: "${r.NEAR_CONNECT_VERSION}",
        
        outerHeight: ${window.outerHeight},
        screenY: ${window.screenY},
        outerWidth: ${window.outerWidth},
        screenX: ${window.screenX},

        providers: {
          mainnet: ${JSON.stringify(n.mainnet)},
          testnet: ${JSON.stringify(n.testnet)},
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
    `}t.default=o},3543:function(e,t,n){"use strict";var r=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0});let o=n(7052),s=n(1017),a=r(n(1930)),i=(0,s.uuid4)();class l{connector;manifest;activePanels={};storageSpace;constructor(e,t){this.connector=e,this.manifest=t,this.storageSpace=t.id}checkPermissions(e,t){if("walletConnect"===e)return!!this.manifest.permissions.walletConnect;if("external"===e){let e=this.manifest.permissions.external;return!!(e&&t?.entity)&&e.includes(t.entity)}if("allowsOpen"===e){let e=(0,o.parseUrl)(t?.url||""),n=this.manifest.permissions.allowsOpen;return!!(e&&n&&Array.isArray(n))&&0!==n.length&&n.some(t=>{let n=(0,o.parseUrl)(t);return!!n&&e.protocol===n.protocol&&(!n.hostname||e.hostname===n.hostname)&&(!n.pathname||"/"===n.pathname||e.pathname===n.pathname)})}return this.manifest.permissions[e]}assertPermissions(e,t,n){if(!this.checkPermissions(t,n.data.params))throw e.postMessage({...n.data,status:"failed",result:"Permission denied"}),Error("Permission denied")}_onMessage=async(e,t)=>{let n=n=>{e.postMessage({...t.data,status:"success",result:n})},r=n=>{e.postMessage({...t.data,status:"failed",result:n})};if("ui.showIframe"===t.data.method){e.show(),n(null);return}if("ui.hideIframe"===t.data.method){e.hide(),n(null);return}if("storage.set"===t.data.method){this.assertPermissions(e,"storage",t),localStorage.setItem(`${this.storageSpace}:${t.data.params.key}`,t.data.params.value),n(null);return}if("storage.get"===t.data.method){this.assertPermissions(e,"storage",t),n(localStorage.getItem(`${this.storageSpace}:${t.data.params.key}`));return}if("storage.keys"===t.data.method){this.assertPermissions(e,"storage",t),n(Object.keys(localStorage).filter(e=>e.startsWith(`${this.storageSpace}:`)));return}if("storage.remove"===t.data.method){this.assertPermissions(e,"storage",t),localStorage.removeItem(`${this.storageSpace}:${t.data.params.key}`),n(null);return}if("panel.focus"===t.data.method){let e=this.activePanels[t.data.params.windowId];e&&e.focus(),n(null);return}if("panel.postMessage"===t.data.method){let e=this.activePanels[t.data.params.windowId];e&&e.postMessage(t.data.params.data,"*"),n(null);return}if("panel.close"===t.data.method){let e=this.activePanels[t.data.params.windowId];e&&e.close(),delete this.activePanels[t.data.params.windowId],n(null);return}if("walletConnect.connect"===t.data.method){this.assertPermissions(e,"walletConnect",t);try{if(!this.connector.walletConnect)throw Error("WalletConnect is not configured");let e=await this.connector.walletConnect,r=await e.connect(t.data.params);r.approval(),n({uri:r.uri})}catch(e){r(e)}return}if("walletConnect.getProjectId"===t.data.method){if(!this.connector.walletConnect)throw Error("WalletConnect is not configured");this.assertPermissions(e,"walletConnect",t),n((await this.connector.walletConnect).core.projectId);return}if("walletConnect.disconnect"===t.data.method){this.assertPermissions(e,"walletConnect",t);try{if(!this.connector.walletConnect)throw Error("WalletConnect is not configured");let e=await this.connector.walletConnect,r=await e.disconnect(t.data.params);n(r)}catch(e){r(e)}return}if("walletConnect.getSession"===t.data.method){this.assertPermissions(e,"walletConnect",t);try{if(!this.connector.walletConnect)throw Error("WalletConnect is not configured");let e=await this.connector.walletConnect,t=e.session.keys[e.session.keys.length-1],r=t?e.session.get(t):null;n(r?{topic:r.topic,namespaces:r.namespaces}:null)}catch(e){r(e)}return}if("walletConnect.request"===t.data.method){this.assertPermissions(e,"walletConnect",t);try{if(!this.connector.walletConnect)throw Error("WalletConnect is not configured");let e=await this.connector.walletConnect,r=await e.request(t.data.params);n(r)}catch(e){r(e)}return}if("external"===t.data.method){this.assertPermissions(e,"external",t);try{let{entity:e,key:r,args:o}=t.data.params,s=e.split(".").reduce((e,t)=>e[t],window);"nightly.near"===e&&"signTransaction"===r&&(o[0].encode=()=>o[0]);let a="function"==typeof s[r]?await s[r](...o||[]):s[r];n(a)}catch(e){r(e)}return}if("open"===t.data.method){this.assertPermissions(e,"allowsOpen",t);let r="undefined"!=typeof window?window?.Telegram?.WebApp:null;if(r&&t.data.params.url.startsWith("https://t.me")){r.openTelegramLink(t.data.params.url);return}let a=window.open(t.data.params.url,"_blank",t.data.params.features),i=a?(0,s.uuid4)():null,l=n=>{let r=(0,o.parseUrl)(t.data.params.url);r&&r.origin===n.origin&&e.postMessage(n.data)};if(n(i),window.addEventListener("message",l),a&&i){this.activePanels[i]=a;let t=setInterval(()=>{if(a?.closed){window.removeEventListener("message",l),delete this.activePanels[i],clearInterval(t);try{e.postMessage({method:"proxy-window:closed",windowId:i})}catch{}}},500)}return}if("open.nativeApp"===t.data.method){this.assertPermissions(e,"allowsOpen",t);let n=(0,o.parseUrl)(t.data.params.url);if(!n||["https","http","javascript:","file:","data:","blob:","about:"].includes(n.protocol))throw r("Invalid URL"),Error("[open.nativeApp] Invalid URL");let s=document.createElement("iframe");s.src=t.data.params.url,s.style.display="none",document.body.appendChild(s),e.postMessage({...t.data,status:"success",result:null});return}};actualCode=null;async checkNewVersion(e,t){if(this.actualCode)return this.connector.logger?.log("New version of code already checked"),this.actualCode;let n=(0,o.parseUrl)(e.manifest.executor);if(n||(n=(0,o.parseUrl)(location.origin+e.manifest.executor)),!n)throw Error("Invalid executor URL");n.searchParams.set("nonce",i);let r=await fetch(n.toString()).then(e=>e.text());return(this.connector.logger?.log("New version of code fetched"),this.actualCode=r,r===t)?(this.connector.logger?.log("New version of code is the same as the current version"),this.actualCode):(await this.connector.db.setItem(`${this.manifest.id}:${this.manifest.version}`,r),this.connector.logger?.log("New version of code saved to cache"),r)}async loadCode(){let e=await this.connector.db.getItem(`${this.manifest.id}:${this.manifest.version}`).catch(()=>null);this.connector.logger?.log("Code loaded from cache",null!==e);let t=this.checkNewVersion(this,e);return e||await t}async call(e,t){this.connector.logger?.log("Add to queue",e,t),this.connector.logger?.log("Calling method",e,t);let n=await this.loadCode();this.connector.logger?.log("Code loaded, preparing");let r=new a.default(this,n,this._onMessage);this.connector.logger?.log("Code loaded, iframe initialized"),await r.readyPromise,this.connector.logger?.log("Iframe ready");let o=(0,s.uuid4)();return new Promise((n,s)=>{try{let a=i=>{i.data.id===o&&i.data.origin===r.origin&&(r.dispose(),window.removeEventListener("message",a),this.connector.logger?.log("postMessage",{result:i.data,request:{method:e,params:t}}),"failed"===i.data.status?s(i.data.result):n(i.data.result))};window.addEventListener("message",a),r.postMessage({method:e,params:t,id:o}),r.on("close",()=>s(Error("Wallet closed")))}catch(e){this.connector.logger?.log("Iframe error",e),s(e)}})}async getAllStorage(){let e=Object.keys(localStorage).filter(e=>e.startsWith(`${this.storageSpace}:`)),t={};for(let n of e)t[n.replace(`${this.storageSpace}:`,"")]=localStorage.getItem(n);return t}async clearStorage(){for(let e of Object.keys(localStorage).filter(e=>e.startsWith(`${this.storageSpace}:`)))localStorage.removeItem(e)}}t.default=l},1930:function(e,t,n){"use strict";var r=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0});let o=n(9203),s=n(1017),a=n(9159),i=r(n(9391));class l{executor;origin;iframe=document.createElement("iframe");events=new o.EventEmitter;popup;handler;readyPromiseResolve;readyPromise=new Promise(e=>{this.readyPromiseResolve=e});constructor(e,t,n){this.executor=e,this.origin=(0,s.uuid4)(),this.handler=e=>{e.data.origin===this.origin&&("wallet-ready"===e.data.method&&this.readyPromiseResolve(),n(this,e))},window.addEventListener("message",this.handler);let r=[];this.executor.checkPermissions("usb")&&r.push("usb *;"),this.executor.checkPermissions("hid")&&r.push("hid *;"),this.executor.checkPermissions("clipboardRead")&&r.push("clipboard-read;"),this.executor.checkPermissions("clipboardWrite")&&r.push("clipboard-write;"),this.executor.checkPermissions("bluetooth")&&r.push("bluetooth *;"),this.iframe.allow=r.join(" "),this.iframe.setAttribute("sandbox","allow-scripts"),(0,i.default)({id:this.origin,executor:this.executor,code:t}).then(e=>{this.executor.connector.logger?.log("Iframe code injected"),this.iframe.srcdoc=e}),this.popup=new a.IframeWalletPopup({footer:this.executor.connector.footerBranding,iframe:this.iframe,onApprove:()=>{},onReject:()=>{window.removeEventListener("message",this.handler),this.events.emit("close",{}),this.popup.destroy()}}),this.popup.create()}on(e,t){this.events.on(e,t)}show(){this.popup.show()}hide(){this.popup.hide()}postMessage(e){if(!this.iframe.contentWindow)throw Error("Iframe not loaded");this.iframe.contentWindow.postMessage({...e,origin:this.origin},"*")}dispose(){window.removeEventListener("message",this.handler),this.popup.destroy()}}t.default=l},3070:function(e,t,n){"use strict";var r=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.SandboxWallet=void 0;let o=n(6228),s=r(n(3543));class a{connector;manifest;executor;constructor(e,t){this.connector=e,this.manifest=t,this.executor=new s.default(e,t)}async signIn(e){return this.executor.call("wallet:signIn",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey})}async signInAndSignMessage(e){return this.executor.call("wallet:signInAndSignMessage",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey,messageParams:e.messageParams})}async signOut(e){let t={...e,network:e?.network??this.connector.network};await this.executor.call("wallet:signOut",t),await this.executor.clearStorage()}async getAccounts(e){let t={...e,network:e?.network??this.connector.network};return this.executor.call("wallet:getAccounts",t)}async signAndSendTransaction(e){let t=(0,o.nearActionsToConnectorActions)(e.actions),n={...e,actions:t,network:e.network??this.connector.network};return this.executor.call("wallet:signAndSendTransaction",n)}async signAndSendTransactions(e){let t=e.transactions.map(e=>({actions:(0,o.nearActionsToConnectorActions)(e.actions),receiverId:e.receiverId})),n={...e,transactions:t,network:e.network??this.connector.network};return this.executor.call("wallet:signAndSendTransactions",n)}async signMessage(e){let t={...e,network:e.network??this.connector.network};return this.executor.call("wallet:signMessage",t)}async signDelegateActions(e){let t={...e,delegateActions:e.delegateActions.map(e=>({...e,actions:(0,o.nearActionsToConnectorActions)(e.actions)})),network:e.network??this.connector.network};return this.executor.call("wallet:signDelegateActions",t)}}t.SandboxWallet=a,t.default=a},6228:function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.nearActionsToConnectorActions=void 0;let r=n(451),o=e=>{try{return JSON.parse(new TextDecoder().decode(e))}catch{return e}};t.nearActionsToConnectorActions=e=>e.map(e=>{if("type"in e)return e;if(e.functionCall)return{type:"FunctionCall",params:{methodName:e.functionCall.methodName,args:o(e.functionCall.args),gas:e.functionCall.gas.toString(),deposit:e.functionCall.deposit.toString()}};if(e.deployGlobalContract)return{type:"DeployGlobalContract",params:{code:e.deployGlobalContract.code,deployMode:e.deployGlobalContract.deployMode.AccountId?"AccountId":"CodeHash"}};if(e.createAccount)return{type:"CreateAccount"};if(e.useGlobalContract)return{type:"UseGlobalContract",params:{contractIdentifier:e.useGlobalContract.contractIdentifier.AccountId?{accountId:e.useGlobalContract.contractIdentifier.AccountId}:{codeHash:(0,r.encodeBase58)(e.useGlobalContract.contractIdentifier.CodeHash)}}};if(e.deployContract)return{type:"DeployContract",params:{code:e.deployContract.code}};if(e.deleteAccount)return{type:"DeleteAccount",params:{beneficiaryId:e.deleteAccount.beneficiaryId}};if(e.deleteKey)return{type:"DeleteKey",params:{publicKey:e.deleteKey.publicKey.toString()}};if(e.transfer)return{type:"Transfer",params:{deposit:e.transfer.deposit.toString()}};if(e.stake)return{type:"Stake",params:{stake:e.stake.stake.toString(),publicKey:e.stake.publicKey.toString()}};if(e.addKey)return{type:"AddKey",params:{publicKey:e.addKey.publicKey.toString(),accessKey:{nonce:Number(e.addKey.accessKey.nonce),permission:e.addKey.accessKey.permission.functionCall?{receiverId:e.addKey.accessKey.permission.functionCall.receiverId,allowance:e.addKey.accessKey.permission.functionCall.allowance?.toString(),methodNames:e.addKey.accessKey.permission.functionCall.methodNames}:"FullAccess"}}};throw Error("Unsupported action type")})},451:function(e,t){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.encodeBase58=function(e){if(0===e.length)return"";let t=0,r=0;for(;r<e.length&&0===e[r];)t++,r++;let o=[0];for(;r<e.length;r++){let t=e[r];for(let e=0;e<o.length;++e)t+=o[e]<<8,o[e]=t%58,t=t/58|0;for(;t>0;)o.push(t%58),t=t/58|0}for(;o.length>0&&0===o[o.length-1];)o.pop();let s="";for(let e=0;e<t;e++)s+=n[0];for(let e=o.length-1;e>=0;--e)s+=n[o[e]];return s};let n="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"},9203:function(e,t){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.EventEmitter=void 0;class n{events={};on(e,t){this.events[e]||(this.events[e]=[]),this.events[e].push(t)}emit(e,t){this.events[e]?.forEach(e=>e(t))}off(e,t){this.events[e]=this.events[e]?.filter(e=>e!==t)}once(e,t){let n=r=>{t(r),this.off(e,n)};this.on(e,n)}removeAllListeners(e){e?delete this.events[e]:this.events={}}}t.EventEmitter=n},4317:function(e,t){"use strict";function n(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}Object.defineProperty(t,"__esModule",{value:!0}),t.escapeHtml=n,t.html=function(e,...t){let o=e[0];for(let s=0;s<t.length;s++){for(let e of Array.isArray(t[s])?t[s]:[t[s]]){let t=e?.[r]?e[r]:n(String(e??""));o+=t}o+=e[s+1]}return Object.freeze({[r]:o,get html(){return o}})};let r=Symbol("htmlTag")},2001:function(e,t){"use strict";Object.defineProperty(t,"__esModule",{value:!0});class n{dbName;storeName;version;constructor(e,t){this.dbName=e,this.storeName=t,this.version=1}getDb(){return new Promise((e,t)=>{if("undefined"==typeof window||"undefined"==typeof indexedDB){t(Error("IndexedDB is not available (SSR environment)"));return}let n=indexedDB.open(this.dbName,this.version);n.onerror=e=>{console.error("Error opening database:",e.target.error),t(Error("Error opening database"))},n.onsuccess=t=>{e(n.result)},n.onupgradeneeded=e=>{let t=n.result;t.objectStoreNames.contains(this.storeName)||t.createObjectStore(this.storeName)}})}async getItem(e){let t=await this.getDb();if("number"==typeof e&&(e=e.toString()),"string"!=typeof e)throw Error("Key must be a string");return new Promise((n,r)=>{if(!this.storeName){r(Error("Store name not set"));return}let o=t.transaction(this.storeName,"readonly");o.onerror=e=>r(o.error);let s=o.objectStore(this.storeName).get(e);s.onerror=e=>r(s.error),s.onsuccess=()=>{n(s.result),t.close()}})}async setItem(e,t){let n=await this.getDb();if("number"==typeof e&&(e=e.toString()),"string"!=typeof e)throw Error("Key must be a string");return new Promise((r,o)=>{if(!this.storeName){o(Error("Store name not set"));return}let s=n.transaction(this.storeName,"readwrite");s.onerror=e=>o(s.error);let a=s.objectStore(this.storeName).put(t,e);a.onerror=e=>o(a.error),a.onsuccess=()=>{n.close(),r()}})}async removeItem(e){let t=await this.getDb();if("number"==typeof e&&(e=e.toString()),"string"!=typeof e)throw Error("Key must be a string");return new Promise((n,r)=>{if(!this.storeName){r(Error("Store name not set"));return}let o=t.transaction(this.storeName,"readwrite");o.onerror=e=>r(o.error);let s=o.objectStore(this.storeName).delete(e);s.onerror=e=>r(s.error),s.onsuccess=()=>{t.close(),n()}})}async keys(){let e=await this.getDb();return new Promise((t,n)=>{if(!this.storeName){n(Error("Store name not set"));return}let r=e.transaction(this.storeName,"readonly");r.onerror=e=>n(r.error);let o=r.objectStore(this.storeName).getAllKeys();o.onerror=e=>n(o.error),o.onsuccess=()=>{t(o.result),e.close()}})}async count(){let e=await this.getDb();return new Promise((t,n)=>{if(!this.storeName){n(Error("Store name not set"));return}let r=e.transaction(this.storeName,"readonly");r.onerror=e=>n(r.error);let o=r.objectStore(this.storeName).count();o.onerror=e=>n(o.error),o.onsuccess=()=>{t(o.result),e.close()}})}async length(){return this.count()}async clear(){let e=await this.getDb();return new Promise((t,n)=>{if(!this.storeName){n(Error("Store name not set"));return}let r=e.transaction(this.storeName,"readwrite");r.onerror=e=>n(r.error);let o=r.objectStore(this.storeName).clear();o.onerror=e=>n(o.error),o.onsuccess=()=>{e.close(),t()}})}}t.default=n},4139:function(e,t){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.LocalStorage=void 0;class n{async get(e){return"undefined"==typeof window?null:localStorage.getItem(e)}async set(e,t){"undefined"!=typeof window&&localStorage.setItem(e,t)}async remove(e){"undefined"!=typeof window&&localStorage.removeItem(e)}}t.LocalStorage=n},7052:function(e,t){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.parseUrl=void 0,t.parseUrl=e=>{try{return new URL(e)}catch{return null}}},1017:function(e,t){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.uuid4=void 0,t.uuid4=()=>"undefined"!=typeof window&&void 0!==window.crypto&&"function"==typeof window.crypto.randomUUID?window.crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(e){let t=16*Math.random()|0;return("x"===e?t:3&t|8).toString(16)})},2857:function(e,t,n){"use strict";t.$2=void 0,n(4139),n(3793),n(3070),n(6387);var r=n(9765);Object.defineProperty(t,"$2",{enumerable:!0,get:function(){return r.NearConnector}}),n(6228)},3688:function(e,t){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.NEAR_CONNECT_VERSION=void 0,t.NEAR_CONNECT_VERSION="0.11.1"},9159:function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.IframeWalletPopup=void 0;let r=n(4317),o=n(2190);class s extends o.Popup{delegate;constructor(e){super(e),this.delegate=e}handlers(){super.handlers(),this.addListener("button","click",()=>this.delegate.onApprove())}create(){super.create({show:!1}),this.root.querySelector(".modal-body").appendChild(this.delegate.iframe),this.delegate.iframe.style.width="100%",this.delegate.iframe.style.height="720px",this.delegate.iframe.style.border="none"}get footer(){if(!this.delegate.footer)return"";let{icon:e,heading:t}=this.delegate.footer;return(0,r.html)`
      <div class="footer">
        ${e?(0,r.html)`<img src="${e}" alt="${t}" />`:""}
        <p>${t}</p>
      </div>
    `}get dom(){return(0,r.html)`<div class="modal-container">
      <div class="modal-content">
        <div class="modal-body" style="padding: 0; overflow: auto;"></div>
        ${this.footer}
      </div>
    </div>`}}t.IframeWalletPopup=s},9523:function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.NearWalletsPopup=void 0;let r=n(4317),o=n(7052),s=n(2190),a={id:"custom-wallet",name:"Custom Wallet",icon:"https://www.mynearwallet.com/images/webclip.png",description:"Custom wallet for NEAR.",website:"",version:"1.0.0",executor:"your-executor-url.js",type:"sandbox",platform:{},features:{signMessage:!0,signInWithoutAddKey:!0,signInAndSignMessage:!0,signAndSendTransaction:!0,signAndSendTransactions:!0,signDelegateActions:!0},permissions:{storage:!0,allowsOpen:[]}};class i extends s.Popup{delegate;constructor(e){super(e),this.delegate=e,this.update({wallets:e.wallets,showSettings:!1})}handlers(){super.handlers(),this.addListener(".settings-button","click",()=>this.update({showSettings:!0})),this.addListener(".back-button","click",()=>this.update({showSettings:!1})),this.root.querySelectorAll(".connect-item").forEach(e=>{e instanceof HTMLDivElement&&this.addListener(e,"click",()=>this.delegate.onSelect(e.dataset.type))}),this.root.querySelectorAll(".remove-wallet-button").forEach(e=>{e instanceof SVGSVGElement&&this.addListener(e,"click",async t=>{t.stopPropagation(),await this.delegate.onRemoveDebugManifest(e.dataset.type);let n=this.state.wallets.filter(t=>t.id!==e.dataset.type);this.update({wallets:n})})}),this.addListener(".add-debug-manifest-button","click",async()=>{try{let e=this.root.querySelector("#debug-manifest-input")?.value??"",t=await this.delegate.onAddDebugManifest(e);this.update({showSettings:!1,wallets:[t,...this.state.wallets]})}catch(e){alert(`Something went wrong: ${e}`)}})}create(){super.create({show:!0})}walletDom(e){let t=(0,r.html)`
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
    `;return(0,r.html)`
      <div class="connect-item" data-type="${e.id}">
        <img style="background: #333" src="${e.icon}" alt="${e.name}" />
        <div class="connect-item-info">
          <span>${e.name}</span>
          <span class="wallet-address">${o.parseUrl(e.website)?.hostname}</span>
        </div>
        ${e.debug?t:""}
      </div>
    `}get footer(){if(!this.delegate.footer)return"";let{icon:e,heading:t,link:n,linkText:o}=this.delegate.footer;return(0,r.html)`
      <div class="footer">
        ${e?(0,r.html)`<img src="${e}" alt="${t}" />`:""}
        <p>${t}</p>
        <a class="get-wallet-link" href="${n}" target="_blank">${o}</a>
      </div>
    `}get dom(){return this.state.showSettings?(0,r.html)`
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
      `:(0,r.html)`<div class="modal-container">
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
    </div>`}}t.NearWalletsPopup=i},2190:function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.Popup=void 0;let r=n(7969),o=n(4317),s=`n${Math.random().toString(36).substring(2,15)}`;if("undefined"!=typeof document){let e=document.createElement("style");e.textContent=(0,r.css)(`.${s}`),document.head.append(e)}class a{delegate;isClosed=!1;root=document.createElement("div");state={};constructor(e){this.delegate=e}get dom(){return(0,o.html)``}disposables=[];addListener(e,t,n){let r="string"==typeof e?this.root.querySelector(e):e;r&&(r.addEventListener(t,n),this.disposables.push(()=>r.removeEventListener(t,n)))}handlers(){this.disposables.forEach(e=>e()),this.disposables=[];let e=this.root.querySelector(".modal-container");this.root.querySelector(".modal-content").onclick=e=>e.stopPropagation(),e.onclick=()=>{this.delegate.onReject(),this.destroy()}}update(e){this.state={...this.state,...e},this.root.innerHTML=this.dom.html,this.handlers()}create({show:e=!0}){this.root.className=`${s} hot-connector-popup`,this.root.innerHTML=this.dom.html,document.body.append(this.root),this.handlers();let t=this.root.querySelector(".modal-container");this.root.querySelector(".modal-content").style.transform="translateY(50px)",t.style.opacity="0",this.root.style.display="none",e&&setTimeout(()=>this.show(),10)}show(){let e=this.root.querySelector(".modal-container"),t=this.root.querySelector(".modal-content");t.style.transform="translateY(50px)",e.style.opacity="0",this.root.style.display="block",setTimeout(()=>{t.style.transform="translateY(0)",e.style.opacity="1"},100)}hide(){let e=this.root.querySelector(".modal-container");this.root.querySelector(".modal-content").style.transform="translateY(50px)",e.style.opacity="0",setTimeout(()=>{this.root.style.display="none"},200)}destroy(){this.isClosed||(this.isClosed=!0,this.hide(),setTimeout(()=>{this.root.remove()},200))}}t.Popup=a},7969:function(e,t){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.css=void 0,t.css=e=>`
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
`},6021:function(e,t,n){"use strict";/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */function r(e){return e instanceof Uint8Array||ArrayBuffer.isView(e)&&"Uint8Array"===e.constructor.name}function o(e,t){return!!Array.isArray(t)&&(0===t.length||(e?t.every(e=>"string"==typeof e):t.every(e=>Number.isSafeInteger(e))))}function s(e){if("function"!=typeof e)throw Error("function expected");return!0}function a(e,t){if("string"!=typeof t)throw Error(`${e}: string expected`);return!0}function i(e){if(!Number.isSafeInteger(e))throw Error(`invalid integer: ${e}`)}function l(e){if(!Array.isArray(e))throw Error("array expected")}function c(e,t){if(!o(!0,t))throw Error(`${e}: array of strings expected`)}function d(e,t){if(!o(!1,t))throw Error(`${e}: array of numbers expected`)}n.d(t,{gW:function(){return b}});let u=(e,t)=>0===t?e:u(t,e%t),h=(e,t)=>e+(t-u(e,t)),g=(()=>{let e=[];for(let t=0;t<40;t++)e.push(2**t);return e})();function w(e,t,n,r){if(l(e),t<=0||t>32)throw Error(`convertRadix2: wrong from=${t}`);if(n<=0||n>32)throw Error(`convertRadix2: wrong to=${n}`);if(h(t,n)>32)throw Error(`convertRadix2: carry overflow from=${t} to=${n} carryBits=${h(t,n)}`);let o=0,s=0,a=g[t],c=g[n]-1,d=[];for(let r of e){if(i(r),r>=a)throw Error(`convertRadix2: invalid data word=${r} from=${t}`);if(o=o<<t|r,s+t>32)throw Error(`convertRadix2: carry overflow pos=${s} from=${t}`);for(s+=t;s>=n;s-=n)d.push((o>>s-n&c)>>>0);let e=g[s];if(void 0===e)throw Error("invalid carry");o&=e-1}if(o=o<<n-s&c,!r&&s>=t)throw Error("Excess padding");if(!r&&o>0)throw Error(`Non-zero padding: ${o}`);return r&&s>0&&d.push(o>>>0),d}function f(e){return s(e),function(...t){try{return e.apply(null,t)}catch(e){}}}"function"==typeof Uint8Array.from([]).toBase64&&Uint8Array.fromBase64;let p=function(...e){let t=e=>e,n=(e,t)=>n=>e(t(n));return{encode:e.map(e=>e.encode).reduceRight(n,t),decode:e.map(e=>e.decode).reduce(n,t)}}(function(e){let t="string"==typeof e?e.split(""):e,n=t.length;c("alphabet",t);let r=new Map(t.map((e,t)=>[e,t]));return{encode:r=>(l(r),r.map(r=>{if(!Number.isSafeInteger(r)||r<0||r>=n)throw Error(`alphabet.encode: digit index outside alphabet "${r}". Allowed: ${e}`);return t[r]})),decode:t=>(l(t),t.map(t=>{a("alphabet.decode",t);let n=r.get(t);if(void 0===n)throw Error(`Unknown letter: "${t}". Allowed: ${e}`);return n}))}}("qpzry9x8gf2tvdw0s3jn54khce6mua7l"),function(e=""){return a("join",e),{encode:t=>(c("join.decode",t),t.join(e)),decode:t=>(a("join.decode",t),t.split(e))}}("")),m=[996825010,642813549,513874426,1027748829,705979059];function y(e){let t=e>>25,n=(33554431&e)<<5;for(let e=0;e<m.length;e++)(t>>e&1)==1&&(n^=m[e]);return n}function v(e,t,n=1){let r=e.length,o=1;for(let t=0;t<r;t++){let n=e.charCodeAt(t);if(n<33||n>126)throw Error(`Invalid prefix (${e})`);o=y(o)^n>>5}o=y(o);for(let t=0;t<r;t++)o=y(o)^31&e.charCodeAt(t);for(let e of t)o=y(o)^e;for(let e=0;e<6;e++)o=y(o);return o^=n,p.encode(w([o%g[30]],30,5,!1))}let b=function(e){let t="bech32"===e?1:734539939,n=function(e,t=!1){if(i(5),e>32)throw Error("radix2: bits should be in (0..32]");if(h(8,e)>32||h(e,8)>32)throw Error("radix2: carry overflow");return{encode:n=>{if(!r(n))throw Error("radix2.encode input should be Uint8Array");return w(Array.from(n),8,e,!t)},decode:n=>(d("radix2.decode",n),Uint8Array.from(w(n,e,8,t)))}}(5),o=n.decode,s=n.encode,l=f(o);function c(e,n,o=90){a("bech32.encode prefix",e),r(n)&&(n=Array.from(n)),d("bech32.encode",n);let s=e.length;if(0===s)throw TypeError(`Invalid prefix length ${s}`);let i=s+7+n.length;if(!1!==o&&i>o)throw TypeError(`Length ${i} exceeds limit ${o}`);let l=e.toLowerCase(),c=v(l,n,t);return`${l}1${p.encode(n)}${c}`}function u(e,n=90){a("bech32.decode input",e);let r=e.length;if(r<8||!1!==n&&r>n)throw TypeError(`invalid string length: ${r} (${e}). Expected (8..${n})`);let o=e.toLowerCase();if(e!==o&&e!==e.toUpperCase())throw Error("String must be lowercase or uppercase");let s=o.lastIndexOf("1");if(0===s||-1===s)throw Error('Letter "1" must be present between prefix and data only');let i=o.slice(0,s),l=o.slice(s+1);if(l.length<6)throw Error("Data must be at least 6 characters long");let c=p.decode(l).slice(0,-6),d=v(i,c,t);if(!l.endsWith(d))throw Error(`Invalid checksum in ${e}: expected "${d}"`);return{prefix:i,words:c}}let g=f(u);return{encode:c,decode:u,encodeFromBytes:function(e,t){return c(e,s(t))},decodeToBytes:function(e){let{prefix:t,words:n}=u(e,!1);return{prefix:t,words:n,bytes:o(n)}},decodeUnsafe:g,fromWords:o,fromWordsUnsafe:l,toWords:s}}("bech32");"function"==typeof Uint8Array.from([]).toHex&&"function"==typeof Uint8Array.fromHex||s(e=>{if("string"!=typeof e||e.length%2!=0)throw TypeError(`hex.decode: expected string, got ${typeof e} with length ${e.length}`);return e.toLowerCase()})}}]);
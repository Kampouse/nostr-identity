"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[874],{8064:function(e,t,r){Object.defineProperty(t,"$",{enumerable:!0,get:function(){return o}});let n=r(4590);function o(e){let{createServerReference:t}=r(6671);return t(e,n.callServer)}},6387:function(e,t,r){Object.defineProperty(t,"__esModule",{value:!0}),t.InjectedWallet=void 0;let n=r(6228);class o{connector;wallet;constructor(e,t){this.connector=e,this.wallet=t}get manifest(){return this.wallet.manifest}async signIn({addFunctionCallKey:e,network:t}){return this.wallet.signIn({network:t??this.connector.network,addFunctionCallKey:e})}async signInAndSignMessage(e){return this.wallet.signInAndSignMessage({network:e?.network??this.connector.network,addFunctionCallKey:e.addFunctionCallKey,messageParams:e.messageParams})}async signOut(e){await this.wallet.signOut({network:e?.network??this.connector.network})}async getAccounts(e){return this.wallet.getAccounts({network:e?.network??this.connector.network})}async signAndSendTransaction(e){let t=(0,n.nearActionsToConnectorActions)(e.actions),r=e.network??this.connector.network,o=await this.wallet.signAndSendTransaction({...e,actions:t,network:r});if(!o)throw Error("No result from wallet");return Array.isArray(o.transactions)?o.transactions[0]:o}async signAndSendTransactions(e){let t=e.network??this.connector.network,r=e.transactions.map(e=>({actions:(0,n.nearActionsToConnectorActions)(e.actions),receiverId:e.receiverId})),o=await this.wallet.signAndSendTransactions({...e,transactions:r,network:t});if(!o)throw Error("No result from wallet");return Array.isArray(o.transactions)?o.transactions:o}async signMessage(e){return this.wallet.signMessage({...e,network:e.network??this.connector.network})}async signDelegateActions(e){return this.wallet.signDelegateActions({...e,delegateActions:e.delegateActions.map(e=>({...e,actions:(0,n.nearActionsToConnectorActions)(e.actions)})),network:e.network??this.connector.network})}}t.InjectedWallet=o},9765:function(e,t,r){var n=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.NearConnector=void 0;let o=r(9203),a=r(9523),s=r(4139),i=n(r(2001)),l=r(3793),c=r(6387),d=r(3070),u=["https://raw.githubusercontent.com/hot-dao/near-selector/refs/heads/main/repository/manifest.json","https://cdn.jsdelivr.net/gh/azbang/hot-connector/repository/manifest.json"];class h{storage;events;db;logger;wallets=[];manifest={wallets:[],version:"1.0.0"};features={};network="mainnet";providers={mainnet:[],testnet:[]};walletConnect;footerBranding;excludedWallets=[];autoConnect;whenManifestLoaded;constructor(e){this.db=new i.default("hot-connector","wallets"),this.storage=e?.storage??new s.LocalStorage,this.events=e?.events??new o.EventEmitter,this.logger=e?.logger,this.network=e?.network??"mainnet",this.walletConnect=e?.walletConnect,this.autoConnect=e?.autoConnect??!0,this.providers=e?.providers??{mainnet:[],testnet:[]},this.excludedWallets=e?.excludedWallets??[],this.features=e?.features??{},e?.footerBranding!==void 0?this.footerBranding=e?.footerBranding:this.footerBranding={icon:"https://pages.near.org/wp-content/uploads/2023/11/NEAR_token.png",heading:"NEAR Connector",link:"https://wallet.near.org",linkText:"Don't have a wallet?"},this.whenManifestLoaded=new Promise(async t=>{e?.manifest==null||"string"==typeof e.manifest?this.manifest=await this._loadManifest(e?.manifest).catch(()=>({wallets:[],version:"1.0.0"})):this.manifest=e?.manifest??{wallets:[],version:"1.0.0"};let r=new Set(this.excludedWallets);r.delete("hot-wallet"),this.manifest.wallets=this.manifest.wallets.filter(e=>!(e.permissions.walletConnect&&!this.walletConnect||r.has(e.id))),await new Promise(e=>setTimeout(e,100)),t()}),"undefined"!=typeof window&&(window.addEventListener("near-wallet-injected",this._handleNearWalletInjected),window.dispatchEvent(new Event("near-selector-ready")),window.addEventListener("message",async e=>{"near-wallet-injected"===e.data.type&&(await this.whenManifestLoaded.catch(()=>{}),this.wallets=this.wallets.filter(t=>t.manifest.id!==e.data.manifest.id),this.wallets.unshift(new l.ParentFrameWallet(this,e.data.manifest)),this.events.emit("selector:walletsChanged",{}),this.autoConnect&&this.connect({walletId:e.data.manifest.id}))})),this.whenManifestLoaded.then(()=>{"undefined"!=typeof window&&window.parent.postMessage({type:"near-selector-ready"},"*"),this.manifest.wallets.forEach(e=>this.registerWallet(e)),this.storage.get("debug-wallets").then(e=>{JSON.parse(e??"[]").forEach(e=>this.registerDebugWallet(e))})})}get availableWallets(){return this.wallets.filter(e=>Object.entries(this.features).every(([t,r])=>!r||!!e.manifest.features?.[t])).filter(e=>!!("testnet"!==this.network||e.manifest.features?.testnet))}_handleNearWalletInjected=e=>{this.wallets=this.wallets.filter(t=>t.manifest.id!==e.detail.manifest.id),this.wallets.unshift(new c.InjectedWallet(this,e.detail)),this.events.emit("selector:walletsChanged",{})};async _loadManifest(e){for(let t of e?[e]:u){let e=await fetch(t).catch(()=>null);if(e&&e.ok)return await e.json()}throw Error("Failed to load manifest")}async switchNetwork(e,t){this.network!==e&&(await this.disconnect().catch(()=>{}),this.network=e,await this.connect(t))}async registerWallet(e){if("sandbox"!==e.type)throw Error("Only sandbox wallets are supported");this.wallets.find(t=>t.manifest.id===e.id)||(this.wallets.push(new d.SandboxWallet(this,e)),this.events.emit("selector:walletsChanged",{}))}async registerDebugWallet(e){let t="string"==typeof e?JSON.parse(e):e;if("sandbox"!==t.type)throw Error("Only sandbox wallets type are supported");if(!t.id)throw Error("Manifest must have an id");if(!t.name)throw Error("Manifest must have a name");if(!t.icon)throw Error("Manifest must have an icon");if(!t.website)throw Error("Manifest must have a website");if(!t.version)throw Error("Manifest must have a version");if(!t.executor)throw Error("Manifest must have an executor");if(!t.features)throw Error("Manifest must have features");if(!t.permissions)throw Error("Manifest must have permissions");if(this.wallets.find(e=>e.manifest.id===t.id))throw Error("Wallet already registered");t.debug=!0,this.wallets.unshift(new d.SandboxWallet(this,t)),this.events.emit("selector:walletsChanged",{});let r=this.wallets.filter(e=>e.manifest.debug).map(e=>e.manifest);return this.storage.set("debug-wallets",JSON.stringify(r)),t}async removeDebugWallet(e){this.wallets=this.wallets.filter(t=>t.manifest.id!==e);let t=this.wallets.filter(e=>e.manifest.debug).map(e=>e.manifest);this.storage.set("debug-wallets",JSON.stringify(t)),this.events.emit("selector:walletsChanged",{})}async selectWallet({features:e={}}={}){return await this.whenManifestLoaded.catch(()=>{}),new Promise((t,r)=>{let n=new a.NearWalletsPopup({footer:this.footerBranding,wallets:this.availableWallets.filter(t=>0===Object.entries(e).length||Object.entries(e).filter(([e,t])=>!0===t).every(([e])=>t.manifest.features?.[e]===!0)).map(e=>e.manifest),onRemoveDebugManifest:async e=>this.removeDebugWallet(e),onAddDebugManifest:async e=>this.registerDebugWallet(e),onReject:()=>(r(Error("User rejected")),n.destroy()),onSelect:e=>(t(e),n.destroy())});n.create()})}async connect(e={}){let t=e.walletId,r=e.signMessageParams;await this.whenManifestLoaded.catch(()=>{}),t||(t=await this.selectWallet({features:{signInAndSignMessage:null!=e.signMessageParams||void 0,signInWithFunctionCallKey:null!=e.addFunctionCallKey||void 0}}));try{let n;let o=await this.wallet(t);if(this.logger?.log("Wallet available to connect",o),await this.storage.set("selected-wallet",t),this.logger?.log(`Set preferred wallet, try to signIn${null!=r?" (with signed message)":""}`,t),null!=e.addFunctionCallKey&&(this.logger?.log("Adding function call access key during sign in with params",e.addFunctionCallKey),n={...e.addFunctionCallKey,gasAllowance:e.addFunctionCallKey.gasAllowance??{amount:"250000000000000000000000",kind:"limited"}}),null!=r){let e=await o.signInAndSignMessage({addFunctionCallKey:n,messageParams:r,network:this.network});if(!e?.length)throw Error("Failed to sign in");this.logger?.log("Signed in to wallet (with signed message)",t,e),this.events.emit("wallet:signInAndSignMessage",{wallet:o,accounts:e,success:!0}),this.events.emit("wallet:signIn",{wallet:o,accounts:e.map(e=>({accountId:e.accountId,publicKey:e.publicKey})),success:!0,source:"signInAndSignMessage"})}else{let e=await o.signIn({addFunctionCallKey:n,network:this.network});if(!e?.length)throw Error("Failed to sign in");this.logger?.log("Signed in to wallet",t,e),this.events.emit("wallet:signIn",{wallet:o,accounts:e,success:!0,source:"signIn"})}return o}catch(e){throw this.logger?.log("Failed to connect to wallet",e),e}}async disconnect(e){e||(e=await this.wallet()),await e.signOut({network:this.network}),await this.storage.remove("selected-wallet"),this.events.emit("wallet:signOut",{success:!0})}async getConnectedWallet(){await this.whenManifestLoaded.catch(()=>{});let e=await this.storage.get("selected-wallet"),t=this.wallets.find(t=>t.manifest.id===e);if(!t)throw Error("No wallet selected");let r=await t.getAccounts();if(!r?.length)throw Error("No accounts found");return{wallet:t,accounts:r}}async wallet(e){if(await this.whenManifestLoaded.catch(()=>{}),!e)return this.getConnectedWallet().then(({wallet:e})=>e).catch(async()=>{throw await this.storage.remove("selected-wallet"),Error("No accounts found")});let t=this.wallets.find(t=>t.manifest.id===e);if(!t)throw Error("Wallet not found");return t}async use(e){await this.whenManifestLoaded.catch(()=>{}),this.wallets=this.wallets.map(t=>new Proxy(t,{get(t,r,n){let o=Reflect.get(t,r,n);if(r in e&&"function"==typeof o){let n=e[r];return function(...e){let r=()=>o.apply(t,e);return e.length>0?n.call(this,...e,r):n.call(this,void 0,r)}}return o}}))}on(e,t){this.events.on(e,t)}once(e,t){this.events.once(e,t)}off(e,t){this.events.off(e,t)}removeAllListeners(e){this.events.removeAllListeners(e)}}t.NearConnector=h},3793:function(e,t,r){Object.defineProperty(t,"__esModule",{value:!0}),t.ParentFrameWallet=void 0;let n=r(6228),o=r(1017);class a{connector;manifest;constructor(e,t){this.connector=e,this.manifest=t}callParentFrame(e,t){let r=(0,o.uuid4)();return window.parent.postMessage({type:"near-wallet-injected-request",id:r,method:e,params:t},"*"),new Promise((e,t)=>{let n=o=>{"near-wallet-injected-response"===o.data.type&&o.data.id===r&&(window.removeEventListener("message",n),o.data.success?e(o.data.result):t(o.data.error))};window.addEventListener("message",n)})}async signIn(e){let t=await this.callParentFrame("near:signIn",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey});return Array.isArray(t)?t:[t]}async signInAndSignMessage(e){let t=await this.callParentFrame("near:signInAndSignMessage",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey,messageParams:e.messageParams});return Array.isArray(t)?t:[t]}async signOut(e){let t={...e,network:e?.network??this.connector.network};await this.callParentFrame("near:signOut",t)}async getAccounts(e){let t={...e,network:e?.network??this.connector.network};return this.callParentFrame("near:getAccounts",t)}async signAndSendTransaction(e){let t=(0,n.nearActionsToConnectorActions)(e.actions),r={...e,actions:t,network:e.network??this.connector.network};return this.callParentFrame("near:signAndSendTransaction",r)}async signAndSendTransactions(e){let t={...e,network:e.network??this.connector.network};return t.transactions=t.transactions.map(e=>({actions:(0,n.nearActionsToConnectorActions)(e.actions),receiverId:e.receiverId})),this.callParentFrame("near:signAndSendTransactions",t)}async signMessage(e){let t={...e,network:e.network??this.connector.network};return this.callParentFrame("near:signMessage",t)}async signDelegateActions(e){let t={...e,delegateActions:e.delegateActions.map(e=>({...e,actions:(0,n.nearActionsToConnectorActions)(e.actions)})),network:e.network||this.connector.network};return this.callParentFrame("near:signDelegateActions",t)}}t.ParentFrameWallet=a},9391:function(e,t,r){Object.defineProperty(t,"__esModule",{value:!0});let n=r(3688);async function o(e){let t=await e.executor.getAllStorage(),r=e.executor.connector.providers,o=e.executor.manifest,a=e.id,s=e.code.replaceAll(".localStorage",".sandboxedLocalStorage").replaceAll("window.top","window.selector").replaceAll("window.open","window.selector.open");return`
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
            if (event.data.origin !== "${a}") return;
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
          window.parent.postMessage({ method: "wallet-ready", origin: "${a}" }, "*");
          window.selector.wallet = wallet;
        },

        async call(method, params) {
          const id = window.selector.uuid();
          window.parent.postMessage({ method, params, id, origin: "${a}" }, "*");

          return new Promise((resolve, reject) => {
            const handler = (event) => {
              if (event.data.id !== id || event.data.origin !== "${a}") return;
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
            origin: "${a}", 
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
        if (event.data.origin !== "${a}") return;
        if (!event.data.method?.startsWith("wallet:")) return;
      
        const wallet = window.selector.wallet;
        const method = event.data.method.replace("wallet:", "");
        const payload = { id: event.data.id, origin: "${a}", method };
      
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

      <script type="module">${s}</script>
    </body>
  </html>
    `}t.default=o},3543:function(e,t,r){var n=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0});let o=r(7052),a=r(1017),s=n(r(1930)),i=(0,a.uuid4)();class l{connector;manifest;activePanels={};storageSpace;constructor(e,t){this.connector=e,this.manifest=t,this.storageSpace=t.id}checkPermissions(e,t){if("walletConnect"===e)return!!this.manifest.permissions.walletConnect;if("external"===e){let e=this.manifest.permissions.external;return!!(e&&t?.entity)&&e.includes(t.entity)}if("allowsOpen"===e){let e=(0,o.parseUrl)(t?.url||""),r=this.manifest.permissions.allowsOpen;return!!(e&&r&&Array.isArray(r))&&0!==r.length&&r.some(t=>{let r=(0,o.parseUrl)(t);return!!r&&e.protocol===r.protocol&&(!r.hostname||e.hostname===r.hostname)&&(!r.pathname||"/"===r.pathname||e.pathname===r.pathname)})}return this.manifest.permissions[e]}assertPermissions(e,t,r){if(!this.checkPermissions(t,r.data.params))throw e.postMessage({...r.data,status:"failed",result:"Permission denied"}),Error("Permission denied")}_onMessage=async(e,t)=>{let r=r=>{e.postMessage({...t.data,status:"success",result:r})},n=r=>{e.postMessage({...t.data,status:"failed",result:r})};if("ui.showIframe"===t.data.method){e.show(),r(null);return}if("ui.hideIframe"===t.data.method){e.hide(),r(null);return}if("storage.set"===t.data.method){this.assertPermissions(e,"storage",t),localStorage.setItem(`${this.storageSpace}:${t.data.params.key}`,t.data.params.value),r(null);return}if("storage.get"===t.data.method){this.assertPermissions(e,"storage",t),r(localStorage.getItem(`${this.storageSpace}:${t.data.params.key}`));return}if("storage.keys"===t.data.method){this.assertPermissions(e,"storage",t),r(Object.keys(localStorage).filter(e=>e.startsWith(`${this.storageSpace}:`)));return}if("storage.remove"===t.data.method){this.assertPermissions(e,"storage",t),localStorage.removeItem(`${this.storageSpace}:${t.data.params.key}`),r(null);return}if("panel.focus"===t.data.method){let e=this.activePanels[t.data.params.windowId];e&&e.focus(),r(null);return}if("panel.postMessage"===t.data.method){let e=this.activePanels[t.data.params.windowId];e&&e.postMessage(t.data.params.data,"*"),r(null);return}if("panel.close"===t.data.method){let e=this.activePanels[t.data.params.windowId];e&&e.close(),delete this.activePanels[t.data.params.windowId],r(null);return}if("walletConnect.connect"===t.data.method){this.assertPermissions(e,"walletConnect",t);try{if(!this.connector.walletConnect)throw Error("WalletConnect is not configured");let e=await this.connector.walletConnect,n=await e.connect(t.data.params);n.approval(),r({uri:n.uri})}catch(e){n(e)}return}if("walletConnect.getProjectId"===t.data.method){if(!this.connector.walletConnect)throw Error("WalletConnect is not configured");this.assertPermissions(e,"walletConnect",t),r((await this.connector.walletConnect).core.projectId);return}if("walletConnect.disconnect"===t.data.method){this.assertPermissions(e,"walletConnect",t);try{if(!this.connector.walletConnect)throw Error("WalletConnect is not configured");let e=await this.connector.walletConnect,n=await e.disconnect(t.data.params);r(n)}catch(e){n(e)}return}if("walletConnect.getSession"===t.data.method){this.assertPermissions(e,"walletConnect",t);try{if(!this.connector.walletConnect)throw Error("WalletConnect is not configured");let e=await this.connector.walletConnect,t=e.session.keys[e.session.keys.length-1],n=t?e.session.get(t):null;r(n?{topic:n.topic,namespaces:n.namespaces}:null)}catch(e){n(e)}return}if("walletConnect.request"===t.data.method){this.assertPermissions(e,"walletConnect",t);try{if(!this.connector.walletConnect)throw Error("WalletConnect is not configured");let e=await this.connector.walletConnect,n=await e.request(t.data.params);r(n)}catch(e){n(e)}return}if("external"===t.data.method){this.assertPermissions(e,"external",t);try{let{entity:e,key:n,args:o}=t.data.params,a=e.split(".").reduce((e,t)=>e[t],window);"nightly.near"===e&&"signTransaction"===n&&(o[0].encode=()=>o[0]);let s="function"==typeof a[n]?await a[n](...o||[]):a[n];r(s)}catch(e){n(e)}return}if("open"===t.data.method){this.assertPermissions(e,"allowsOpen",t);let n="undefined"!=typeof window?window?.Telegram?.WebApp:null;if(n&&t.data.params.url.startsWith("https://t.me")){n.openTelegramLink(t.data.params.url);return}let s=window.open(t.data.params.url,"_blank",t.data.params.features),i=s?(0,a.uuid4)():null,l=r=>{let n=(0,o.parseUrl)(t.data.params.url);n&&n.origin===r.origin&&e.postMessage(r.data)};if(r(i),window.addEventListener("message",l),s&&i){this.activePanels[i]=s;let t=setInterval(()=>{if(s?.closed){window.removeEventListener("message",l),delete this.activePanels[i],clearInterval(t);try{e.postMessage({method:"proxy-window:closed",windowId:i})}catch{}}},500)}return}if("open.nativeApp"===t.data.method){this.assertPermissions(e,"allowsOpen",t);let r=(0,o.parseUrl)(t.data.params.url);if(!r||["https","http","javascript:","file:","data:","blob:","about:"].includes(r.protocol))throw n("Invalid URL"),Error("[open.nativeApp] Invalid URL");let a=document.createElement("iframe");a.src=t.data.params.url,a.style.display="none",document.body.appendChild(a),e.postMessage({...t.data,status:"success",result:null});return}};actualCode=null;async checkNewVersion(e,t){if(this.actualCode)return this.connector.logger?.log("New version of code already checked"),this.actualCode;let r=(0,o.parseUrl)(e.manifest.executor);if(r||(r=(0,o.parseUrl)(location.origin+e.manifest.executor)),!r)throw Error("Invalid executor URL");r.searchParams.set("nonce",i);let n=await fetch(r.toString()).then(e=>e.text());return(this.connector.logger?.log("New version of code fetched"),this.actualCode=n,n===t)?(this.connector.logger?.log("New version of code is the same as the current version"),this.actualCode):(await this.connector.db.setItem(`${this.manifest.id}:${this.manifest.version}`,n),this.connector.logger?.log("New version of code saved to cache"),n)}async loadCode(){let e=await this.connector.db.getItem(`${this.manifest.id}:${this.manifest.version}`).catch(()=>null);this.connector.logger?.log("Code loaded from cache",null!==e);let t=this.checkNewVersion(this,e);return e||await t}async call(e,t){this.connector.logger?.log("Add to queue",e,t),this.connector.logger?.log("Calling method",e,t);let r=await this.loadCode();this.connector.logger?.log("Code loaded, preparing");let n=new s.default(this,r,this._onMessage);this.connector.logger?.log("Code loaded, iframe initialized"),await n.readyPromise,this.connector.logger?.log("Iframe ready");let o=(0,a.uuid4)();return new Promise((r,a)=>{try{let s=i=>{i.data.id===o&&i.data.origin===n.origin&&(n.dispose(),window.removeEventListener("message",s),this.connector.logger?.log("postMessage",{result:i.data,request:{method:e,params:t}}),"failed"===i.data.status?a(i.data.result):r(i.data.result))};window.addEventListener("message",s),n.postMessage({method:e,params:t,id:o}),n.on("close",()=>a(Error("Wallet closed")))}catch(e){this.connector.logger?.log("Iframe error",e),a(e)}})}async getAllStorage(){let e=Object.keys(localStorage).filter(e=>e.startsWith(`${this.storageSpace}:`)),t={};for(let r of e)t[r.replace(`${this.storageSpace}:`,"")]=localStorage.getItem(r);return t}async clearStorage(){for(let e of Object.keys(localStorage).filter(e=>e.startsWith(`${this.storageSpace}:`)))localStorage.removeItem(e)}}t.default=l},1930:function(e,t,r){var n=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0});let o=r(9203),a=r(1017),s=r(9159),i=n(r(9391));class l{executor;origin;iframe=document.createElement("iframe");events=new o.EventEmitter;popup;handler;readyPromiseResolve;readyPromise=new Promise(e=>{this.readyPromiseResolve=e});constructor(e,t,r){this.executor=e,this.origin=(0,a.uuid4)(),this.handler=e=>{e.data.origin===this.origin&&("wallet-ready"===e.data.method&&this.readyPromiseResolve(),r(this,e))},window.addEventListener("message",this.handler);let n=[];this.executor.checkPermissions("usb")&&n.push("usb *;"),this.executor.checkPermissions("hid")&&n.push("hid *;"),this.executor.checkPermissions("clipboardRead")&&n.push("clipboard-read;"),this.executor.checkPermissions("clipboardWrite")&&n.push("clipboard-write;"),this.executor.checkPermissions("bluetooth")&&n.push("bluetooth *;"),this.iframe.allow=n.join(" "),this.iframe.setAttribute("sandbox","allow-scripts"),(0,i.default)({id:this.origin,executor:this.executor,code:t}).then(e=>{this.executor.connector.logger?.log("Iframe code injected"),this.iframe.srcdoc=e}),this.popup=new s.IframeWalletPopup({footer:this.executor.connector.footerBranding,iframe:this.iframe,onApprove:()=>{},onReject:()=>{window.removeEventListener("message",this.handler),this.events.emit("close",{}),this.popup.destroy()}}),this.popup.create()}on(e,t){this.events.on(e,t)}show(){this.popup.show()}hide(){this.popup.hide()}postMessage(e){if(!this.iframe.contentWindow)throw Error("Iframe not loaded");this.iframe.contentWindow.postMessage({...e,origin:this.origin},"*")}dispose(){window.removeEventListener("message",this.handler),this.popup.destroy()}}t.default=l},3070:function(e,t,r){var n=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.SandboxWallet=void 0;let o=r(6228),a=n(r(3543));class s{connector;manifest;executor;constructor(e,t){this.connector=e,this.manifest=t,this.executor=new a.default(e,t)}async signIn(e){return this.executor.call("wallet:signIn",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey})}async signInAndSignMessage(e){return this.executor.call("wallet:signInAndSignMessage",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey,messageParams:e.messageParams})}async signOut(e){let t={...e,network:e?.network??this.connector.network};await this.executor.call("wallet:signOut",t),await this.executor.clearStorage()}async getAccounts(e){let t={...e,network:e?.network??this.connector.network};return this.executor.call("wallet:getAccounts",t)}async signAndSendTransaction(e){let t=(0,o.nearActionsToConnectorActions)(e.actions),r={...e,actions:t,network:e.network??this.connector.network};return this.executor.call("wallet:signAndSendTransaction",r)}async signAndSendTransactions(e){let t=e.transactions.map(e=>({actions:(0,o.nearActionsToConnectorActions)(e.actions),receiverId:e.receiverId})),r={...e,transactions:t,network:e.network??this.connector.network};return this.executor.call("wallet:signAndSendTransactions",r)}async signMessage(e){let t={...e,network:e.network??this.connector.network};return this.executor.call("wallet:signMessage",t)}async signDelegateActions(e){let t={...e,delegateActions:e.delegateActions.map(e=>({...e,actions:(0,o.nearActionsToConnectorActions)(e.actions)})),network:e.network??this.connector.network};return this.executor.call("wallet:signDelegateActions",t)}}t.SandboxWallet=s,t.default=s},6228:function(e,t,r){Object.defineProperty(t,"__esModule",{value:!0}),t.nearActionsToConnectorActions=void 0;let n=r(451),o=e=>{try{return JSON.parse(new TextDecoder().decode(e))}catch{return e}};t.nearActionsToConnectorActions=e=>e.map(e=>{if("type"in e)return e;if(e.functionCall)return{type:"FunctionCall",params:{methodName:e.functionCall.methodName,args:o(e.functionCall.args),gas:e.functionCall.gas.toString(),deposit:e.functionCall.deposit.toString()}};if(e.deployGlobalContract)return{type:"DeployGlobalContract",params:{code:e.deployGlobalContract.code,deployMode:e.deployGlobalContract.deployMode.AccountId?"AccountId":"CodeHash"}};if(e.createAccount)return{type:"CreateAccount"};if(e.useGlobalContract)return{type:"UseGlobalContract",params:{contractIdentifier:e.useGlobalContract.contractIdentifier.AccountId?{accountId:e.useGlobalContract.contractIdentifier.AccountId}:{codeHash:(0,n.encodeBase58)(e.useGlobalContract.contractIdentifier.CodeHash)}}};if(e.deployContract)return{type:"DeployContract",params:{code:e.deployContract.code}};if(e.deleteAccount)return{type:"DeleteAccount",params:{beneficiaryId:e.deleteAccount.beneficiaryId}};if(e.deleteKey)return{type:"DeleteKey",params:{publicKey:e.deleteKey.publicKey.toString()}};if(e.transfer)return{type:"Transfer",params:{deposit:e.transfer.deposit.toString()}};if(e.stake)return{type:"Stake",params:{stake:e.stake.stake.toString(),publicKey:e.stake.publicKey.toString()}};if(e.addKey)return{type:"AddKey",params:{publicKey:e.addKey.publicKey.toString(),accessKey:{nonce:Number(e.addKey.accessKey.nonce),permission:e.addKey.accessKey.permission.functionCall?{receiverId:e.addKey.accessKey.permission.functionCall.receiverId,allowance:e.addKey.accessKey.permission.functionCall.allowance?.toString(),methodNames:e.addKey.accessKey.permission.functionCall.methodNames}:"FullAccess"}}};throw Error("Unsupported action type")})},451:function(e,t){Object.defineProperty(t,"__esModule",{value:!0}),t.encodeBase58=function(e){if(0===e.length)return"";let t=0,n=0;for(;n<e.length&&0===e[n];)t++,n++;let o=[0];for(;n<e.length;n++){let t=e[n];for(let e=0;e<o.length;++e)t+=o[e]<<8,o[e]=t%58,t=t/58|0;for(;t>0;)o.push(t%58),t=t/58|0}for(;o.length>0&&0===o[o.length-1];)o.pop();let a="";for(let e=0;e<t;e++)a+=r[0];for(let e=o.length-1;e>=0;--e)a+=r[o[e]];return a};let r="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"},9203:function(e,t){Object.defineProperty(t,"__esModule",{value:!0}),t.EventEmitter=void 0;class r{events={};on(e,t){this.events[e]||(this.events[e]=[]),this.events[e].push(t)}emit(e,t){this.events[e]?.forEach(e=>e(t))}off(e,t){this.events[e]=this.events[e]?.filter(e=>e!==t)}once(e,t){let r=n=>{t(n),this.off(e,r)};this.on(e,r)}removeAllListeners(e){e?delete this.events[e]:this.events={}}}t.EventEmitter=r},4317:function(e,t){function r(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}Object.defineProperty(t,"__esModule",{value:!0}),t.escapeHtml=r,t.html=function(e,...t){let o=e[0];for(let a=0;a<t.length;a++){for(let e of Array.isArray(t[a])?t[a]:[t[a]]){let t=e?.[n]?e[n]:r(String(e??""));o+=t}o+=e[a+1]}return Object.freeze({[n]:o,get html(){return o}})};let n=Symbol("htmlTag")},2001:function(e,t){Object.defineProperty(t,"__esModule",{value:!0});class r{dbName;storeName;version;constructor(e,t){this.dbName=e,this.storeName=t,this.version=1}getDb(){return new Promise((e,t)=>{if("undefined"==typeof window||"undefined"==typeof indexedDB){t(Error("IndexedDB is not available (SSR environment)"));return}let r=indexedDB.open(this.dbName,this.version);r.onerror=e=>{console.error("Error opening database:",e.target.error),t(Error("Error opening database"))},r.onsuccess=t=>{e(r.result)},r.onupgradeneeded=e=>{let t=r.result;t.objectStoreNames.contains(this.storeName)||t.createObjectStore(this.storeName)}})}async getItem(e){let t=await this.getDb();if("number"==typeof e&&(e=e.toString()),"string"!=typeof e)throw Error("Key must be a string");return new Promise((r,n)=>{if(!this.storeName){n(Error("Store name not set"));return}let o=t.transaction(this.storeName,"readonly");o.onerror=e=>n(o.error);let a=o.objectStore(this.storeName).get(e);a.onerror=e=>n(a.error),a.onsuccess=()=>{r(a.result),t.close()}})}async setItem(e,t){let r=await this.getDb();if("number"==typeof e&&(e=e.toString()),"string"!=typeof e)throw Error("Key must be a string");return new Promise((n,o)=>{if(!this.storeName){o(Error("Store name not set"));return}let a=r.transaction(this.storeName,"readwrite");a.onerror=e=>o(a.error);let s=a.objectStore(this.storeName).put(t,e);s.onerror=e=>o(s.error),s.onsuccess=()=>{r.close(),n()}})}async removeItem(e){let t=await this.getDb();if("number"==typeof e&&(e=e.toString()),"string"!=typeof e)throw Error("Key must be a string");return new Promise((r,n)=>{if(!this.storeName){n(Error("Store name not set"));return}let o=t.transaction(this.storeName,"readwrite");o.onerror=e=>n(o.error);let a=o.objectStore(this.storeName).delete(e);a.onerror=e=>n(a.error),a.onsuccess=()=>{t.close(),r()}})}async keys(){let e=await this.getDb();return new Promise((t,r)=>{if(!this.storeName){r(Error("Store name not set"));return}let n=e.transaction(this.storeName,"readonly");n.onerror=e=>r(n.error);let o=n.objectStore(this.storeName).getAllKeys();o.onerror=e=>r(o.error),o.onsuccess=()=>{t(o.result),e.close()}})}async count(){let e=await this.getDb();return new Promise((t,r)=>{if(!this.storeName){r(Error("Store name not set"));return}let n=e.transaction(this.storeName,"readonly");n.onerror=e=>r(n.error);let o=n.objectStore(this.storeName).count();o.onerror=e=>r(o.error),o.onsuccess=()=>{t(o.result),e.close()}})}async length(){return this.count()}async clear(){let e=await this.getDb();return new Promise((t,r)=>{if(!this.storeName){r(Error("Store name not set"));return}let n=e.transaction(this.storeName,"readwrite");n.onerror=e=>r(n.error);let o=n.objectStore(this.storeName).clear();o.onerror=e=>r(o.error),o.onsuccess=()=>{e.close(),t()}})}}t.default=r},4139:function(e,t){Object.defineProperty(t,"__esModule",{value:!0}),t.LocalStorage=void 0;class r{async get(e){return"undefined"==typeof window?null:localStorage.getItem(e)}async set(e,t){"undefined"!=typeof window&&localStorage.setItem(e,t)}async remove(e){"undefined"!=typeof window&&localStorage.removeItem(e)}}t.LocalStorage=r},7052:function(e,t){Object.defineProperty(t,"__esModule",{value:!0}),t.parseUrl=void 0,t.parseUrl=e=>{try{return new URL(e)}catch{return null}}},1017:function(e,t){Object.defineProperty(t,"__esModule",{value:!0}),t.uuid4=void 0,t.uuid4=()=>"undefined"!=typeof window&&void 0!==window.crypto&&"function"==typeof window.crypto.randomUUID?window.crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(e){let t=16*Math.random()|0;return("x"===e?t:3&t|8).toString(16)})},2857:function(e,t,r){t.$2=void 0,r(4139),r(3793),r(3070),r(6387);var n=r(9765);Object.defineProperty(t,"$2",{enumerable:!0,get:function(){return n.NearConnector}}),r(6228)},3688:function(e,t){Object.defineProperty(t,"__esModule",{value:!0}),t.NEAR_CONNECT_VERSION=void 0,t.NEAR_CONNECT_VERSION="0.11.1"},9159:function(e,t,r){Object.defineProperty(t,"__esModule",{value:!0}),t.IframeWalletPopup=void 0;let n=r(4317),o=r(2190);class a extends o.Popup{delegate;constructor(e){super(e),this.delegate=e}handlers(){super.handlers(),this.addListener("button","click",()=>this.delegate.onApprove())}create(){super.create({show:!1}),this.root.querySelector(".modal-body").appendChild(this.delegate.iframe),this.delegate.iframe.style.width="100%",this.delegate.iframe.style.height="720px",this.delegate.iframe.style.border="none"}get footer(){if(!this.delegate.footer)return"";let{icon:e,heading:t}=this.delegate.footer;return(0,n.html)`
      <div class="footer">
        ${e?(0,n.html)`<img src="${e}" alt="${t}" />`:""}
        <p>${t}</p>
      </div>
    `}get dom(){return(0,n.html)`<div class="modal-container">
      <div class="modal-content">
        <div class="modal-body" style="padding: 0; overflow: auto;"></div>
        ${this.footer}
      </div>
    </div>`}}t.IframeWalletPopup=a},9523:function(e,t,r){Object.defineProperty(t,"__esModule",{value:!0}),t.NearWalletsPopup=void 0;let n=r(4317),o=r(7052),a=r(2190),s={id:"custom-wallet",name:"Custom Wallet",icon:"https://www.mynearwallet.com/images/webclip.png",description:"Custom wallet for NEAR.",website:"",version:"1.0.0",executor:"your-executor-url.js",type:"sandbox",platform:{},features:{signMessage:!0,signInWithoutAddKey:!0,signInAndSignMessage:!0,signAndSendTransaction:!0,signAndSendTransactions:!0,signDelegateActions:!0},permissions:{storage:!0,allowsOpen:[]}};class i extends a.Popup{delegate;constructor(e){super(e),this.delegate=e,this.update({wallets:e.wallets,showSettings:!1})}handlers(){super.handlers(),this.addListener(".settings-button","click",()=>this.update({showSettings:!0})),this.addListener(".back-button","click",()=>this.update({showSettings:!1})),this.root.querySelectorAll(".connect-item").forEach(e=>{e instanceof HTMLDivElement&&this.addListener(e,"click",()=>this.delegate.onSelect(e.dataset.type))}),this.root.querySelectorAll(".remove-wallet-button").forEach(e=>{e instanceof SVGSVGElement&&this.addListener(e,"click",async t=>{t.stopPropagation(),await this.delegate.onRemoveDebugManifest(e.dataset.type);let r=this.state.wallets.filter(t=>t.id!==e.dataset.type);this.update({wallets:r})})}),this.addListener(".add-debug-manifest-button","click",async()=>{try{let e=this.root.querySelector("#debug-manifest-input")?.value??"",t=await this.delegate.onAddDebugManifest(e);this.update({showSettings:!1,wallets:[t,...this.state.wallets]})}catch(e){alert(`Something went wrong: ${e}`)}})}create(){super.create({show:!0})}walletDom(e){let t=(0,n.html)`
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

              <textarea style="width: 100%;" id="debug-manifest-input" rows="10">${JSON.stringify(s,null,2)}</textarea>
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
    </div>`}}t.NearWalletsPopup=i},2190:function(e,t,r){Object.defineProperty(t,"__esModule",{value:!0}),t.Popup=void 0;let n=r(7969),o=r(4317),a=`n${Math.random().toString(36).substring(2,15)}`;if("undefined"!=typeof document){let e=document.createElement("style");e.textContent=(0,n.css)(`.${a}`),document.head.append(e)}class s{delegate;isClosed=!1;root=document.createElement("div");state={};constructor(e){this.delegate=e}get dom(){return(0,o.html)``}disposables=[];addListener(e,t,r){let n="string"==typeof e?this.root.querySelector(e):e;n&&(n.addEventListener(t,r),this.disposables.push(()=>n.removeEventListener(t,r)))}handlers(){this.disposables.forEach(e=>e()),this.disposables=[];let e=this.root.querySelector(".modal-container");this.root.querySelector(".modal-content").onclick=e=>e.stopPropagation(),e.onclick=()=>{this.delegate.onReject(),this.destroy()}}update(e){this.state={...this.state,...e},this.root.innerHTML=this.dom.html,this.handlers()}create({show:e=!0}){this.root.className=`${a} hot-connector-popup`,this.root.innerHTML=this.dom.html,document.body.append(this.root),this.handlers();let t=this.root.querySelector(".modal-container");this.root.querySelector(".modal-content").style.transform="translateY(50px)",t.style.opacity="0",this.root.style.display="none",e&&setTimeout(()=>this.show(),10)}show(){let e=this.root.querySelector(".modal-container"),t=this.root.querySelector(".modal-content");t.style.transform="translateY(50px)",e.style.opacity="0",this.root.style.display="block",setTimeout(()=>{t.style.transform="translateY(0)",e.style.opacity="1"},100)}hide(){let e=this.root.querySelector(".modal-container");this.root.querySelector(".modal-content").style.transform="translateY(50px)",e.style.opacity="0",setTimeout(()=>{this.root.style.display="none"},200)}destroy(){this.isClosed||(this.isClosed=!0,this.hide(),setTimeout(()=>{this.root.remove()},200))}}t.Popup=s},7969:function(e,t){Object.defineProperty(t,"__esModule",{value:!0}),t.css=void 0,t.css=e=>`
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
`},5186:function(e,t,r){let n;r.r(t),r.d(t,{Point:function(){return H},Signature:function(){return eo},etc:function(){return eO},getPublicKey:function(){return ee},getSharedSecret:function(){return eN},hash:function(){return T},hashes:function(){return ef},keygen:function(){return eT},recoverPublicKey:function(){return eI},recoverPublicKeyAsync:function(){return eM},schnorr:function(){return e2},sign:function(){return eS},signAsync:function(){return eE},utils:function(){return eK},verify:function(){return eC},verifyAsync:function(){return eP}});/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */let o={p:0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,n:0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,h:1n,a:0n,b:7n,Gx:0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,Gy:0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n},{p:a,n:s,Gx:i,Gy:l,b:c}=o,d=32,u={publicKey:d+1,publicKeyUncompressed:65,signature:64,seed:d+d/2},h=(...e)=>{"captureStackTrace"in Error&&"function"==typeof Error.captureStackTrace&&Error.captureStackTrace(...e)},f=(e="")=>{let t=Error(e);throw h(t,f),t},g=e=>"bigint"==typeof e,w=e=>"string"==typeof e,p=e=>e instanceof Uint8Array||ArrayBuffer.isView(e)&&"Uint8Array"===e.constructor.name,m=(e,t,r="")=>{let n=p(e),o=e?.length,a=void 0!==t;return(!n||a&&o!==t)&&f((r&&`"${r}" `)+"expected Uint8Array"+(a?` of length ${t}`:"")+", got "+(n?`length=${o}`:`type=${typeof e}`)),e},y=e=>new Uint8Array(e),b=(e,t)=>e.toString(16).padStart(t,"0"),v=e=>Array.from(m(e)).map(e=>b(e,2)).join(""),x={_0:48,_9:57,A:65,F:70,a:97,f:102},k=e=>e>=x._0&&e<=x._9?e-x._0:e>=x.A&&e<=x.F?e-(x.A-10):e>=x.a&&e<=x.f?e-(x.a-10):void 0,A=e=>{let t="hex invalid";if(!w(e))return f(t);let r=e.length,n=r/2;if(r%2)return f(t);let o=y(n);for(let r=0,a=0;r<n;r++,a+=2){let n=k(e.charCodeAt(a)),s=k(e.charCodeAt(a+1));if(void 0===n||void 0===s)return f(t);o[r]=16*n+s}return o},S=()=>globalThis?.crypto,E=()=>S()?.subtle??f("crypto.subtle must be defined, consider polyfill"),C=(...e)=>{let t=y(e.reduce((e,t)=>e+m(t).length,0)),r=0;return e.forEach(e=>{t.set(e,r),r+=e.length}),t},P=(e=d)=>S().getRandomValues(y(e)),$=BigInt,I=(e,t,r,n="bad number: out of range")=>g(e)&&t<=e&&e<r?e:f(n),M=(e,t=a)=>{let r=e%t;return r>=0n?r:t+r},N=e=>M(e,s),j=(e,t)=>{(0n===e||t<=0n)&&f("no inverse n="+e+" mod="+t);let r=M(e,t),n=t,o=0n,a=1n,s=1n,i=0n;for(;0n!==r;){let e=n/r,t=n%r,l=o-s*e,c=a-i*e;n=r,r=t,o=s,a=i,s=l,i=c}return 1n===n?M(o,t):f("no inverse")},_=e=>{let t=ef[e];return"function"!=typeof t&&f("hashes."+e+" not set"),t},T=e=>_("sha256")(e),O=e=>e instanceof H?e:f("Point expected"),K=e=>M(M(e*e)*e+c),L=e=>I(e,0n,a),W=e=>I(e,1n,a),B=e=>I(e,1n,s),U=e=>(1n&e)===0n,D=e=>Uint8Array.of(e),R=e=>D(U(e)?2:3),F=e=>{let t=K(W(e)),r=1n;for(let e=t,n=(a+1n)/4n;n>0n;n>>=1n)1n&n&&(r=r*e%a),e=e*e%a;return M(r*r)===t?r:f("sqrt invalid")};class H{static BASE;static ZERO;X;Y;Z;constructor(e,t,r){this.X=L(e),this.Y=W(t),this.Z=L(r),Object.freeze(this)}static CURVE(){return o}static fromAffine(e){let{x:t,y:r}=e;return 0n===t&&0n===r?z:new H(t,r,1n)}static fromBytes(e){let t;m(e);let{publicKey:r,publicKeyUncompressed:n}=u,o=e.length,a=e[0],s=e.subarray(1),i=G(s,0,d);if(o===r&&(2===a||3===a)){let e=F(i),r=U(e);U($(a))!==r&&(e=M(-e)),t=new H(i,e,1n)}return o===n&&4===a&&(t=new H(i,G(s,d,64),1n)),t?t.assertValidity():f("bad point: not on curve")}static fromHex(e){return H.fromBytes(A(e))}get x(){return this.toAffine().x}get y(){return this.toAffine().y}equals(e){let{X:t,Y:r,Z:n}=this,{X:o,Y:a,Z:s}=O(e),i=M(t*s),l=M(o*n),c=M(r*s),d=M(a*n);return i===l&&c===d}is0(){return this.equals(z)}negate(){return new H(this.X,M(-this.Y),this.Z)}double(){return this.add(this)}add(e){let{X:t,Y:r,Z:n}=this,{X:o,Y:a,Z:s}=O(e),i=0n,l=0n,d=0n,u=M(3n*c),h=M(t*o),f=M(r*a),g=M(n*s),w=M(t+r),p=M(o+a);w=M(w*p),p=M(h+f),w=M(w-p),p=M(t+n);let m=M(o+s);return p=M(p*m),m=M(h+g),p=M(p-m),m=M(r+n),i=M(a+s),m=M(m*i),i=M(f+g),m=M(m-i),d=M(0n*p),i=M(u*g),d=M(i+d),i=M(f-d),d=M(f+d),l=M(i*d),f=M(h+h),f=M(f+h),g=M(0n*g),p=M(u*p),f=M(f+g),g=M(h-g),g=M(0n*g),p=M(p+g),h=M(f*p),l=M(l+h),h=M(m*p),i=M(w*i),i=M(i-h),h=M(w*f),d=M(m*d),new H(i,l,d=M(d+h))}subtract(e){return this.add(O(e).negate())}multiply(e,t=!0){if(!t&&0n===e)return z;if(B(e),1n===e)return this;if(this.equals(q))return e8(e).p;let r=z,n=q;for(let o=this;e>0n;o=o.double(),e>>=1n)1n&e?r=r.add(o):t&&(n=n.add(o));return r}multiplyUnsafe(e){return this.multiply(e,!1)}toAffine(){let{X:e,Y:t,Z:r}=this;if(this.equals(z))return{x:0n,y:0n};if(1n===r)return{x:e,y:t};let n=j(r,a);return 1n!==M(r*n)&&f("inverse invalid"),{x:M(e*n),y:M(t*n)}}assertValidity(){let{x:e,y:t}=this.toAffine();return W(e),W(t),M(t*t)===K(e)?this:f("bad point: not on curve")}toBytes(e=!0){let{x:t,y:r}=this.assertValidity().toAffine(),n=J(t);return e?C(R(r),n):C(D(4),n,J(r))}toHex(e){return v(this.toBytes(e))}}let q=new H(i,l,1n),z=new H(0n,1n,0n);H.BASE=q,H.ZERO=z;let V=(e,t,r)=>q.multiply(t,!1).add(e.multiply(r,!1)).assertValidity(),Y=e=>$("0x"+(v(e)||"0")),G=(e,t,r)=>Y(e.subarray(t,r)),Z=2n**256n,J=e=>A(b(I(e,0n,Z),64)),X=e=>I(Y(m(e,d,"secret key")),1n,s,"invalid secret key: outside of range"),Q=e=>e>s>>1n,ee=(e,t=!0)=>q.multiply(X(e)).toBytes(t),et=e=>{[0,1,2,3].includes(e)||f("recovery id must be valid and present")},er=e=>{null==e||ed.includes(e)||f(`Signature format must be one of: ${ed.join(", ")}`),e===ec&&f('Signature format "der" is not supported: switch to noble-curves')},en=(e,t=ei)=>{er(t);let r=u.signature,n=r+1,o=`Signature format "${t}" expects Uint8Array with length `;t===ei&&e.length!==r&&f(o+r),t===el&&e.length!==n&&f(o+n)};class eo{r;s;recovery;constructor(e,t,r){this.r=B(e),this.s=B(t),null!=r&&(this.recovery=r),Object.freeze(this)}static fromBytes(e,t=ei){let r;return en(e,t),t===el&&(r=e[0],e=e.subarray(1)),new eo(G(e,0,d),G(e,d,64),r)}addRecoveryBit(e){return new eo(this.r,this.s,e)}hasHighS(){return Q(this.s)}toBytes(e=ei){let{r:t,s:r,recovery:n}=this,o=C(J(t),J(r));return e===el?(et(n),C(Uint8Array.of(n),o)):o}}let ea=e=>{let t=8*e.length-256;t>1024&&f("msg invalid");let r=Y(e);return t>0?r>>$(t):r},es=e=>N(ea(m(e))),ei="compact",el="recovered",ec="der",ed=[ei,el,ec],eu={lowS:!0,prehash:!0,format:ei,extraEntropy:!1},eh="SHA-256",ef={hmacSha256Async:async(e,t)=>{let r=E(),n="HMAC",o=await r.importKey("raw",e,{name:n,hash:{name:eh}},!1,["sign"]);return y(await r.sign(n,o,t))},hmacSha256:void 0,sha256Async:async e=>y(await E().digest(eh,e)),sha256:void 0},eg=(e,t,r)=>(m(e,void 0,"message"),t.prehash)?r?ef.sha256Async(e):_("sha256")(e):e,ew=y(0),ep=D(0),em=D(1),ey="drbg: tried max amount of iterations",eb=(e,t)=>{let r,n=y(d),o=y(d),a=0,s=()=>{n.fill(1),o.fill(0)},i=(...e)=>_("hmacSha256")(o,C(n,...e)),l=(e=ew)=>{o=i(ep,e),n=i(),0!==e.length&&(o=i(em,e),n=i())},c=()=>(a++>=1e3&&f(ey),n=i());for(s(),l(e);!(r=t(c()));)l();return s(),r},ev=async(e,t)=>{let r,n=y(d),o=y(d),a=0,s=()=>{n.fill(1),o.fill(0)},i=(...e)=>ef.hmacSha256Async(o,C(n,...e)),l=async(e=ew)=>{o=await i(ep,e),n=await i(),0!==e.length&&(o=await i(em,e),n=await i())},c=async()=>(a++>=1e3&&f(ey),n=await i());for(s(),await l(e);!(r=t(await c()));)await l();return s(),r},ex=(e,t,r,n)=>{let{lowS:o,extraEntropy:a}=r,i=es(e),l=J(i),c=X(t),u=[J(c),l];if(null!=a&&!1!==a){let e=!0===a?P(d):a;u.push(m(e,void 0,"extraEntropy"))}return n(C(...u),e=>{let t=ea(e);if(!(1n<=t&&t<s))return;let n=j(t,s),a=q.multiply(t).toAffine(),l=N(a.x);if(0n===l)return;let d=N(n*N(i+l*c));if(0n===d)return;let u=(a.x===l?0:2)|Number(1n&a.y),h=d;return o&&Q(d)&&(h=N(-d),u^=1),new eo(l,h,u).toBytes(r.format)})},ek=(e,t,r,n={})=>{let{lowS:o,format:a}=n;e instanceof eo&&f("Signature must be in Uint8Array, use .toBytes()"),en(e,a),m(r,void 0,"publicKey");try{let{r:n,s:i}=eo.fromBytes(e,a),l=es(t),c=H.fromBytes(r);if(o&&Q(i))return!1;let d=j(i,s),u=N(l*d),h=N(n*d),f=V(c,u,h).toAffine();return N(f.x)===n}catch(e){return!1}},eA=e=>{let t={};return Object.keys(eu).forEach(r=>{t[r]=e[r]??eu[r]}),t},eS=(e,t,r={})=>ex(e=eg(e,r=eA(r),!1),t,r,eb),eE=async(e,t,r={})=>(r=eA(r),ex(e=await eg(e,r,!0),t,r,ev)),eC=(e,t,r,n={})=>ek(e,t=eg(t,n=eA(n),!1),r,n),eP=async(e,t,r,n={})=>(n=eA(n),ek(e,t=await eg(t,n,!0),r,n)),e$=(e,t)=>{let{r,s:n,recovery:o}=eo.fromBytes(e,"recovered");et(o);let a=es(m(t,d)),i=2===o||3===o?r+s:r;W(i);let l=C(R($(o)),J(i)),c=H.fromBytes(l),u=j(i,s);return V(c,N(-a*u),N(n*u)).toBytes()},eI=(e,t,r={})=>e$(e,t=eg(t,eA(r),!1)),eM=async(e,t,r={})=>e$(e,t=await eg(t,eA(r),!0)),eN=(e,t,r=!0)=>H.fromBytes(t).multiply(X(e)).toBytes(r),ej=(e=P(u.seed))=>(m(e),(e.length<u.seed||e.length>1024)&&f("expected 40-1024b"),J(M(Y(e),s-1n)+1n)),e_=e=>t=>{let r=ej(t);return{secretKey:r,publicKey:e(r)}},eT=e_(ee),eO={hexToBytes:A,bytesToHex:v,concatBytes:C,bytesToNumberBE:Y,numberToBytesBE:J,mod:M,invert:j,randomBytes:P,secretKeyToScalar:X,abytes:m},eK={isValidSecretKey:e=>{try{return!!X(e)}catch(e){return!1}},isValidPublicKey:(e,t)=>{let{publicKey:r,publicKeyUncompressed:n}=u;try{let o=e.length;if(!0===t&&o!==r||!1===t&&o!==n)return!1;return!!H.fromBytes(e)}catch(e){return!1}},randomSecretKey:ej},eL=e=>Uint8Array.from("BIP0340/"+e,e=>e.charCodeAt(0)),eW="nonce",eB="challenge",eU=(e,...t)=>{let r=_("sha256"),n=r(eL(e));return r(C(n,n,...t))},eD=async(e,...t)=>{let r=ef.sha256Async,n=await r(eL(e));return await r(C(n,n,...t))},eR=e=>{let t=X(e),{x:r,y:n}=q.multiply(t).assertValidity().toAffine();return{d:U(n)?t:N(-t),px:J(r)}},eF=e=>N(Y(e)),eH=(...e)=>eF(eU(eB,...e)),eq=async(...e)=>eF(await eD(eB,...e)),ez=e=>eR(e).px,eV=e_(ez),eY=(e,t,r)=>{let{px:n,d:o}=eR(t);return{m:m(e),px:n,d:o,a:m(r,d)}},eG=e=>{let t=eF(e);0n===t&&f("sign failed: k is zero");let{px:r,d:n}=eR(J(t));return{rx:r,k:n}},eZ=(e,t,r,n)=>C(t,J(N(e+r*n))),eJ="invalid signature produced",eX=(e,t)=>e instanceof Promise?e.then(t):t(e),eQ=(e,t,r,n)=>{let o=m(e,64,"signature"),i=m(t,void 0,"message"),l=m(r,d,"publicKey");try{let e=Y(l),t=F(e),r=U(t)?t:M(-t),c=new H(e,r,1n).assertValidity(),u=J(c.toAffine().x),h=G(o,0,d);I(h,1n,a);let f=G(o,d,64);I(f,1n,s);let g=C(J(h),u,i);return eX(n(g),e=>{let{x:t,y:r}=V(c,f,N(-e)).toAffine();return!!U(r)&&t===h})}catch(e){return!1}},e0=(e,t,r)=>eQ(e,t,r,eH),e1=async(e,t,r)=>eQ(e,t,r,eq),e2={keygen:eV,getPublicKey:ez,sign:(e,t,r=P(d))=>{let{m:n,px:o,d:a,a:s}=eY(e,t,r),i=J(a^Y(eU("aux",s))),{rx:l,k:c}=eG(eU(eW,i,o,n)),u=eH(l,o,n),h=eZ(c,l,u,a);return e0(h,n,o)||f(eJ),h},verify:e0,signAsync:async(e,t,r=P(d))=>{let{m:n,px:o,d:a,a:s}=eY(e,t,r),i=J(a^Y(await eD("aux",s))),{rx:l,k:c}=eG(await eD(eW,i,o,n)),u=await eq(l,o,n),h=eZ(c,l,u,a);return await e1(h,n,o)||f(eJ),h},verifyAsync:e1},e5=Math.ceil(32)+1,e6=()=>{let e=[],t=q,r=t;for(let n=0;n<e5;n++){r=t,e.push(r);for(let n=1;n<128;n++)r=r.add(t),e.push(r);t=r.double()}return e},e4=(e,t)=>{let r=t.negate();return e?r:t},e8=e=>{let t=n||(n=e6()),r=z,o=q,a=$(255),s=$(8);for(let n=0;n<e5;n++){let i=Number(e&a);e>>=s,i>128&&(i-=256,e+=1n);let l=128*n,c=l+Math.abs(i)-1,d=n%2!=0,u=i<0;0===i?o=o.add(e4(d,t[l])):r=r.add(e4(u,t[c]))}return 0n!==e&&f("invalid wnaf"),{p:r,f:o}}},6132:function(e,t,r){/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */function n(e){return e instanceof Uint8Array||ArrayBuffer.isView(e)&&"Uint8Array"===e.constructor.name}function o(e){if(!n(e))throw Error("Uint8Array expected")}function a(e,t){return!!Array.isArray(t)&&(0===t.length||(e?t.every(e=>"string"==typeof e):t.every(e=>Number.isSafeInteger(e))))}function s(e){if("function"!=typeof e)throw Error("function expected");return!0}function i(e,t){if("string"!=typeof t)throw Error(`${e}: string expected`);return!0}function l(e){if(!Number.isSafeInteger(e))throw Error(`invalid integer: ${e}`)}function c(e){if(!Array.isArray(e))throw Error("array expected")}function d(e,t){if(!a(!0,t))throw Error(`${e}: array of strings expected`)}function u(e,t){if(!a(!1,t))throw Error(`${e}: array of numbers expected`)}function h(...e){let t=e=>e,r=(e,t)=>r=>e(t(r));return{encode:e.map(e=>e.encode).reduceRight(r,t),decode:e.map(e=>e.decode).reduce(r,t)}}function f(e){let t="string"==typeof e?e.split(""):e,r=t.length;d("alphabet",t);let n=new Map(t.map((e,t)=>[e,t]));return{encode:n=>(c(n),n.map(n=>{if(!Number.isSafeInteger(n)||n<0||n>=r)throw Error(`alphabet.encode: digit index outside alphabet "${n}". Allowed: ${e}`);return t[n]})),decode:t=>(c(t),t.map(t=>{i("alphabet.decode",t);let r=n.get(t);if(void 0===r)throw Error(`Unknown letter: "${t}". Allowed: ${e}`);return r}))}}function g(e=""){return i("join",e),{encode:t=>(d("join.decode",t),t.join(e)),decode:t=>(i("join.decode",t),t.split(e))}}function w(e,t="="){return l(e),i("padding",t),{encode(r){for(d("padding.encode",r);r.length*e%8;)r.push(t);return r},decode(r){d("padding.decode",r);let n=r.length;if(n*e%8)throw Error("padding: invalid, string should have whole number of bytes");for(;n>0&&r[n-1]===t;n--)if((n-1)*e%8==0)throw Error("padding: invalid, string has too much padding");return r.slice(0,n)}}}function p(e){return s(e),{encode:e=>e,decode:t=>e(t)}}function m(e,t,r){if(t<2)throw Error(`convertRadix: invalid from=${t}, base cannot be less than 2`);if(r<2)throw Error(`convertRadix: invalid to=${r}, base cannot be less than 2`);if(c(e),!e.length)return[];let n=0,o=[],a=Array.from(e,e=>{if(l(e),e<0||e>=t)throw Error(`invalid integer: ${e}`);return e}),s=a.length;for(;;){let e=0,i=!0;for(let o=n;o<s;o++){let s=a[o],l=t*e,c=l+s;if(!Number.isSafeInteger(c)||l/t!==e||c-s!==l)throw Error("convertRadix: carry overflow");let d=c/r;e=c%r;let u=Math.floor(d);if(a[o]=u,!Number.isSafeInteger(u)||u*r+e!==c)throw Error("convertRadix: carry overflow");i&&(u?i=!1:n=o)}if(o.push(e),i)break}for(let t=0;t<e.length-1&&0===e[t];t++)o.push(0);return o.reverse()}r.r(t),r.d(t,{base16:function(){return P},base32:function(){return $},base32crockford:function(){return j},base32hex:function(){return M},base32hexnopad:function(){return N},base32nopad:function(){return I},base58:function(){return U},base58check:function(){return z},base58flickr:function(){return D},base58xmr:function(){return H},base58xrp:function(){return R},base64:function(){return O},base64nopad:function(){return K},base64url:function(){return L},base64urlnopad:function(){return W},bech32:function(){return X},bech32m:function(){return Q},bytes:function(){return ei},bytesToString:function(){return eo},createBase58check:function(){return q},hex:function(){return et},str:function(){return ea},stringToBytes:function(){return es},utf8:function(){return ee},utils:function(){return C}});let y=(e,t)=>0===t?e:y(t,e%t),b=(e,t)=>e+(t-y(e,t)),v=(()=>{let e=[];for(let t=0;t<40;t++)e.push(2**t);return e})();function x(e,t,r,n){if(c(e),t<=0||t>32)throw Error(`convertRadix2: wrong from=${t}`);if(r<=0||r>32)throw Error(`convertRadix2: wrong to=${r}`);if(b(t,r)>32)throw Error(`convertRadix2: carry overflow from=${t} to=${r} carryBits=${b(t,r)}`);let o=0,a=0,s=v[t],i=v[r]-1,d=[];for(let n of e){if(l(n),n>=s)throw Error(`convertRadix2: invalid data word=${n} from=${t}`);if(o=o<<t|n,a+t>32)throw Error(`convertRadix2: carry overflow pos=${a} from=${t}`);for(a+=t;a>=r;a-=r)d.push((o>>a-r&i)>>>0);let e=v[a];if(void 0===e)throw Error("invalid carry");o&=e-1}if(o=o<<r-a&i,!n&&a>=t)throw Error("Excess padding");if(!n&&o>0)throw Error(`Non-zero padding: ${o}`);return n&&a>0&&d.push(o>>>0),d}function k(e){return l(e),{encode:t=>{if(!n(t))throw Error("radix.encode input should be Uint8Array");return m(Array.from(t),256,e)},decode:t=>(u("radix.decode",t),Uint8Array.from(m(t,e,256)))}}function A(e,t=!1){if(l(e),e<=0||e>32)throw Error("radix2: bits should be in (0..32]");if(b(8,e)>32||b(e,8)>32)throw Error("radix2: carry overflow");return{encode:r=>{if(!n(r))throw Error("radix2.encode input should be Uint8Array");return x(Array.from(r),8,e,!t)},decode:r=>(u("radix2.decode",r),Uint8Array.from(x(r,e,8,t)))}}function S(e){return s(e),function(...t){try{return e.apply(null,t)}catch(e){}}}function E(e,t){return l(e),s(t),{encode(r){if(!n(r))throw Error("checksum.encode: input should be Uint8Array");let o=t(r).slice(0,e),a=new Uint8Array(r.length+e);return a.set(r),a.set(o,r.length),a},decode(r){if(!n(r))throw Error("checksum.decode: input should be Uint8Array");let o=r.slice(0,-e),a=r.slice(-e),s=t(o).slice(0,e);for(let t=0;t<e;t++)if(s[t]!==a[t])throw Error("Invalid checksum");return o}}}let C={alphabet:f,chain:h,checksum:E,convertRadix:m,convertRadix2:x,radix:k,radix2:A,join:g,padding:w},P=h(A(4),f("0123456789ABCDEF"),g("")),$=h(A(5),f("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"),w(5),g("")),I=h(A(5),f("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"),g("")),M=h(A(5),f("0123456789ABCDEFGHIJKLMNOPQRSTUV"),w(5),g("")),N=h(A(5),f("0123456789ABCDEFGHIJKLMNOPQRSTUV"),g("")),j=h(A(5),f("0123456789ABCDEFGHJKMNPQRSTVWXYZ"),g(""),p(e=>e.toUpperCase().replace(/O/g,"0").replace(/[IL]/g,"1"))),_="function"==typeof Uint8Array.from([]).toBase64&&"function"==typeof Uint8Array.fromBase64,T=(e,t)=>{if(i("base64",e),e.length>0&&!(t?/^[A-Za-z0-9=_-]+$/:/^[A-Za-z0-9=+/]+$/).test(e))throw Error("invalid base64");return Uint8Array.fromBase64(e,{alphabet:t?"base64url":"base64",lastChunkHandling:"strict"})},O=_?{encode:e=>(o(e),e.toBase64()),decode:e=>T(e,!1)}:h(A(6),f("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"),w(6),g("")),K=h(A(6),f("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"),g("")),L=_?{encode:e=>(o(e),e.toBase64({alphabet:"base64url"})),decode:e=>T(e,!0)}:h(A(6),f("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"),w(6),g("")),W=h(A(6),f("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"),g("")),B=e=>h(k(58),f(e),g("")),U=B("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"),D=B("123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"),R=B("rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz"),F=[0,2,3,5,6,7,9,10,11],H={encode(e){let t="";for(let r=0;r<e.length;r+=8){let n=e.subarray(r,r+8);t+=U.encode(n).padStart(F[n.length],"1")}return t},decode(e){let t=[];for(let r=0;r<e.length;r+=11){let n=e.slice(r,r+11),o=F.indexOf(n.length),a=U.decode(n);for(let e=0;e<a.length-o;e++)if(0!==a[e])throw Error("base58xmr: wrong padding");t=t.concat(Array.from(a.slice(a.length-o)))}return Uint8Array.from(t)}},q=e=>h(E(4,t=>e(e(t))),U),z=q,V=h(f("qpzry9x8gf2tvdw0s3jn54khce6mua7l"),g("")),Y=[996825010,642813549,513874426,1027748829,705979059];function G(e){let t=e>>25,r=(33554431&e)<<5;for(let e=0;e<Y.length;e++)(t>>e&1)==1&&(r^=Y[e]);return r}function Z(e,t,r=1){let n=e.length,o=1;for(let t=0;t<n;t++){let r=e.charCodeAt(t);if(r<33||r>126)throw Error(`Invalid prefix (${e})`);o=G(o)^r>>5}o=G(o);for(let t=0;t<n;t++)o=G(o)^31&e.charCodeAt(t);for(let e of t)o=G(o)^e;for(let e=0;e<6;e++)o=G(o);return o^=r,V.encode(x([o%v[30]],30,5,!1))}function J(e){let t="bech32"===e?1:734539939,r=A(5),o=r.decode,a=r.encode,s=S(o);function l(e,r,o=90){i("bech32.encode prefix",e),n(r)&&(r=Array.from(r)),u("bech32.encode",r);let a=e.length;if(0===a)throw TypeError(`Invalid prefix length ${a}`);let s=a+7+r.length;if(!1!==o&&s>o)throw TypeError(`Length ${s} exceeds limit ${o}`);let l=e.toLowerCase(),c=Z(l,r,t);return`${l}1${V.encode(r)}${c}`}function c(e,r=90){i("bech32.decode input",e);let n=e.length;if(n<8||!1!==r&&n>r)throw TypeError(`invalid string length: ${n} (${e}). Expected (8..${r})`);let o=e.toLowerCase();if(e!==o&&e!==e.toUpperCase())throw Error("String must be lowercase or uppercase");let a=o.lastIndexOf("1");if(0===a||-1===a)throw Error('Letter "1" must be present between prefix and data only');let s=o.slice(0,a),l=o.slice(a+1);if(l.length<6)throw Error("Data must be at least 6 characters long");let c=V.decode(l).slice(0,-6),d=Z(s,c,t);if(!l.endsWith(d))throw Error(`Invalid checksum in ${e}: expected "${d}"`);return{prefix:s,words:c}}let d=S(c);return{encode:l,decode:c,encodeFromBytes:function(e,t){return l(e,a(t))},decodeToBytes:function(e){let{prefix:t,words:r}=c(e,!1);return{prefix:t,words:r,bytes:o(r)}},decodeUnsafe:d,fromWords:o,fromWordsUnsafe:s,toWords:a}}let X=J("bech32"),Q=J("bech32m"),ee={encode:e=>new TextDecoder().decode(e),decode:e=>new TextEncoder().encode(e)},et="function"==typeof Uint8Array.from([]).toHex&&"function"==typeof Uint8Array.fromHex?{encode:e=>(o(e),e.toHex()),decode:e=>(i("hex",e),Uint8Array.fromHex(e))}:h(A(4),f("0123456789abcdef"),g(""),p(e=>{if("string"!=typeof e||e.length%2!=0)throw TypeError(`hex.decode: expected string, got ${typeof e} with length ${e.length}`);return e.toLowerCase()})),er={utf8:ee,hex:et,base16:P,base32:$,base64:O,base64url:L,base58:U,base58xmr:H},en="Invalid encoding type. Available types: utf8, hex, base16, base32, base64, base64url, base58, base58xmr",eo=(e,t)=>{if("string"!=typeof e||!er.hasOwnProperty(e))throw TypeError(en);if(!n(t))throw TypeError("bytesToString() expects Uint8Array");return er[e].encode(t)},ea=eo,es=(e,t)=>{if(!er.hasOwnProperty(e))throw TypeError(en);if("string"!=typeof t)throw TypeError("stringToBytes() expects string");return er[e].decode(t)},ei=es}}]);
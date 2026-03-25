  const createIdentity = async () => {
    if (!accountId) return

    setLoading(true)
    setError('')

    try {
      // 1. Request wallet signature to prove ownership of NEAR account
      const wallet = await connector.wallet()
      const message = `Generate Nostr identity for ${accountId}`
      
      // This will prompt the user to sign a message with their NEAR wallet
      // This PROVES they control the account
      const signature = await wallet.signMessage({ message })
      
      if (!signature) {
        throw new Error('Wallet signature required to prove account ownership')
      }
      
      console.log('Signature received:', signature)
      
      // 2. Derive key using signature (proves wallet ownership)
      const encoder = new TextEncoder()
      const seedData = encoder.encode(`nostr-identity:${accountId}:${signature}`)
      const hashBuffer = await crypto.subtle.digest('SHA-256', seedData)
      const seed = new Uint8Array(hashBuffer)
      
      // 3. Generate keypair
      const privKey = seed
      const pubKey = secp256k1.getPublicKey(privKey, true)
      
      console.log('Generated pubkey with signature proof')
      
      // 4. Encode to Nostr format
      const npub = encodeNpub(pubKey)
      const nsec = encodeNsec(privKey)
      const pubkeyHex = bytesToHex(pubKey)
      
      setKeys({
        npub,
        nsec,
        pubkeyHex
      })
      
    } catch (err: any) {
      setError(err.message || 'Failed to create identity')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
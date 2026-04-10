# Remote Access via Tailscale

Tailscale lets you securely connect to your OpenClaw server from **anywhere in the world** — from a coffee shop, from work, or from your phone on cellular — without exposing any ports to the public internet.

---

## What is Tailscale?

[Tailscale](https://tailscale.com) creates an encrypted private mesh network (a "tailnet") between your devices.  Each device on your tailnet gets a stable private IP in the `100.x.x.x` range.  Traffic between devices is end-to-end encrypted with WireGuard.

**Why use it with OpenClaw?**

- Your phone can reach the OpenClaw server on your PC even when they are on different networks.
- No port forwarding or router configuration required.
- Tailscale is free for personal use (up to 100 devices).
- All traffic is encrypted — your AI conversations cannot be intercepted.

---

## Step 1 — Install Tailscale on your PC

### Windows

1. Download the installer from [https://tailscale.com/download](https://tailscale.com/download).
2. Run the installer and follow the prompts.
3. Sign in with Google, Microsoft, or GitHub (free account).
4. Tailscale starts automatically and appears in your system tray.

### macOS

```bash
brew install --cask tailscale
```

Or download the macOS app from [https://tailscale.com/download](https://tailscale.com/download).

### Linux

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

---

## Step 2 — Install Tailscale on your phone

- **Android:** install [Tailscale](https://play.google.com/store/apps/details?id=com.tailscale.ipn) from the Google Play Store.
- **iOS:** install [Tailscale](https://apps.apple.com/app/tailscale/id1470499037) from the App Store.

Sign in with the **same account** you used on your PC.  Both devices will appear in your tailnet.

---

## Step 3 — Find your PC's Tailscale IP

On your PC, open a terminal and run:

```bash
tailscale ip -4
```

You will see an address like `100.64.0.12`.  This is your PC's permanent Tailscale IP — it does not change even when you switch networks.

Alternatively, open the Tailscale app and check the **Machines** list.

---

## Step 4 — Start the OpenClaw server

OpenClaw already binds to `0.0.0.0` by default, which means it accepts connections on all network interfaces — including the Tailscale interface — without any extra configuration.

```bash
./start.sh
# or on Windows:
start.bat
```

The terminal will confirm the server is running:

```
[openclaw] ✓ Active backend : lmstudio
[openclaw] Web UI available at http://0.0.0.0:8080/
```

---

## Step 5 — Connect from your phone

Open your phone browser (or the OpenClaw Android app) and navigate to:

```
http://100.64.0.12:8080
```

Replace `100.64.0.12` with your PC's actual Tailscale IP from Step 3.

You should see the OpenClaw web UI, even if your phone is on a completely different network.

---

## Step 6 — Add an auth token (strongly recommended)

When connecting remotely you should protect the server with an auth token so that only your own devices can use it.

**Start the server with a token:**

```bash
./start.sh --token mysupersecrettoken
# or on Windows:
start.bat --token mysupersecrettoken
```

**Or set it in the web UI:**

1. Open `http://100.64.0.12:8080` from your PC.
2. Go to **⚙️ Settings** → **OpenClaw Access Token**.
3. Enter a strong token and click **💾 Save Settings**.

**On your phone:**
- In the web UI: go to **⚙️ Settings** → **OpenClaw Access Token** → enter the same token → **Save Settings**.
- In the Android app: **Settings** → **Auth Token** → enter the token → **Save**.

---

## How the connection looks

```
Phone (cellular or any Wi-Fi)
        │
        │  WireGuard encrypted tunnel (Tailscale)
        ▼
  100.64.0.12:8080  ←── OpenClaw on your PC
        │
        ├── LM Studio  (localhost:1234)
        └── Ollama     (localhost:11434)
```

Your AI requests travel through an encrypted tunnel directly to your PC.  Nothing passes through Tailscale's servers (traffic is peer-to-peer where possible).

---

## Firewall notes

### Windows

Windows Firewall may block the connection.  Allow Python through the firewall:

1. Search "Windows Defender Firewall" → **Allow an app or feature**.
2. Click **Change settings** → **Allow another app**.
3. Browse to your Python executable (e.g. `C:\Users\<you>\AppData\Local\Programs\Python\Python311\python.exe`).
4. Check both **Private** and **Public** networks → **OK**.

### macOS

macOS should prompt you automatically when the server first starts.  Click **Allow**.  
If the prompt does not appear: **System Settings** → **Privacy & Security** → **Firewall** → allow incoming connections for Python.

### Linux

```bash
# If using ufw:
sudo ufw allow 8080/tcp
```

---

## Troubleshooting

### "Connection refused" from phone

- Make sure the OpenClaw server is running on your PC (check the terminal).
- Confirm Tailscale is connected on both devices (green icon / "Connected" status).
- Check that your PC's firewall is not blocking port `8080` (see above).

### Phone shows "offline" badge in OpenClaw

- Verify the Tailscale IP is correct: run `tailscale ip -4` on your PC.
- Open `http://<tailscale-ip>:8080/health` in your phone browser — if it returns JSON, the server is reachable.

### Tailscale says devices are connected but OpenClaw is unreachable

- Try restarting Tailscale on both devices.
- Check that no VPN is interfering with Tailscale on your phone.

### I see the UI but get "Invalid token" errors

- The token on your phone must match the token set on the server exactly (case-sensitive).
- Go to **⚙️ Settings** on both devices and re-enter the token.

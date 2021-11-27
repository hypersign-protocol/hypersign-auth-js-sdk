# Hypersign dAuth Javascript Frontend SDK

## Step1: Create a DOM with id `hs-auth-btn` or `hs-auth-qr` or both

### For Hypersign Login Button

```html
<div id="hs-auth-btn"></div>
```

### For Hypersign QR code

```html
<canvas id="hs-auth-qr"></canvas>
```

## Step2: Add appropriate script

You can use Hypersign dAuth in either of two modes.

1. Websocket
2. Polling

### Using Websocket

```js
<script
  type="module"
  src="https://raw.githubusercontent.com/hypersign-protocol/hypersign-auth-js-sdk/feature/frontendsdk/frontend-sdk/build/v1.0.0/index.js"
  data-rp-socket-url="ws://localhost:4006"
></script>
```

Other optional paramaters:

```js
<script
  type="module"
  src="https://raw.githubusercontent.com/hypersign-protocol/hypersign-auth-js-sdk/feature/frontendsdk/frontend-sdk/build/v1.0.0/index.js"
  data-network-mode="TEST" // Network mode TEST | MAIN. Default value 'MAIN'
  data-listener-mode="SOCKET" // Listener mode SOCKET | POLLING. Default value 'SOCKET'
  data-rp-socket-url="ws://localhost:4006" // Relying party websocket URL
  data-login-button-text="lOGIN wITH hYPERSIGN" // Login button text. Default 'LOGIN USING HYPERSIGN'
></script>
```

### Using Polling

```js
<script
  type="module"
  src="https://raw.githubusercontent.com/hypersign-protocol/hypersign-auth-js-sdk/feature/frontendsdk/frontend-sdk/build/v1.0.0/index.js"
  data-listener-mode="POLLING"
  data-rp-server-base-url="http://localhost:4006"
></script>
```

Other optional paramaters:

```js
<script
  type="module"
  src="https://raw.githubusercontent.com/hypersign-protocol/hypersign-auth-js-sdk/feature/frontendsdk/frontend-sdk/build/v1.0.0/index.js"
  data-network-mode="TEST" // Network mode TEST | MAIN. Default value 'MAIN'
  data-listener-mode="POLLING" // Listener mode SOCKET | POLLING. Default value 'SOCKET'
  data-rp-server-base-url="http://localhost:4006" // Relying party server base URL
  data-rp-challege-resource="/challenge" // Challenge resource path. Default value '/api/v1/auth/challenge'
  data-rp-polling-resource="/poll" // Polling resource path. Default value '/api/v1/auth/poll'
  data-login-button-text="lOGIN wITH hYPERSIGN" // Login button text. Default 'LOGIN USING HYPERSIGN'
  data-polling-interval="5000" // Polling interval. Default value 5000
></script>
```

## Step3: Listen to Events

### `hs-success`

You can listen to `hs-success` event for getting `accessToken` and `refreshToken` once the user is successfully authenticated. Example:

```js
document.addEventListener('hs-success', function (e) {
  alert(JSON.stringify(e.detail));
});
```

Output

```js
{
    "accessToken": "<JWT Token>",
    "refreshToken": "<JWT Token>"
}
```

### `hs-error`

You can listen to `hs-error` event for any other error.

```js
document.addEventListener('hs-error', function (e) {
  console.error(e.detail);
});
```

## Installation

```sh
npm i
```

## Run the project

```sh
npm run dev
```

Browse the login page [http://localhost:1234](http://localhost:1234)

![img](./sample-login-page.png)

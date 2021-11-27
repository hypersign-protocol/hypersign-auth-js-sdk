var QRCode = require('qrcode');

const HS_EVENTS_ENUM = {
  ERROR: 'hs-error',
  SUCCESS: 'hs-success',
};

const LISTENER_MODE_ENUM = {
  POLLING: 'POLLING',
  SOCKET: 'SOCKET',
};

const ENV_ENUM = {
  TEST: 'TEST',
  MAIN: 'MAIN',
};

/**
 * Checks if browser support WebSocket
 * @returns Boolean
 */
function checkForWebSocketSupport() {
  window.WebSocket = window.WebSocket || window.MozWebSocket;
  if (!window.WebSocket) {
    return false;
  }
  return true;
}

function dispatchEvents({ accessToken, refreshToken }) {
  if (!accessToken || !refreshToken) {
    return document.dispatchEvent(
      new CustomEvent(HS_EVENTS_ENUM.ERROR, {
        detail: 'Could not fetch accessToken or refreshToken after authentication',
        bubbles: true,
      })
    );
  }

  document.dispatchEvent(
    new CustomEvent(HS_EVENTS_ENUM.SUCCESS, {
      detail: { accessToken, refreshToken },
      bubbles: true,
    })
  );
}

/**
 * Initiates Socket and Does all the work for fetching the challenge and access tokens.
 */
function initiateSocket({ rpServerSocketURL, hsLoginBtnDOM, hsLoginQRDOM, hsloginBtnText, hsWalletBaseURL }) {
  if (!rpServerSocketURL) {
    throw new Error('HSAuth:: Relying Party Websocket URL must passed');
  }

  let ws = new WebSocket(rpServerSocketURL);

  ws.onopen = function () {};

  ws.onmessage = function ({ data }) {
    let messageData = JSON.parse(data);
    if (messageData.op == 'init') {
      formQRAndButtonHTML({
        hsWalletBaseURL,
        hsLoginBtnDOM,
        hsLoginQRDOM,
        qrDataStr: JSON.stringify(messageData.data),
        hsloginBtnText,
      });
    } else if (messageData.op == 'end') {
      ws.close();
      const { accessToken, refreshToken } = messageData.data.hypersign.data;
      dispatchEvents({
        accessToken,
        refreshToken,
      });
    }
  };

  ws.onerror = function (e) {
    document.dispatchEvent(
      new CustomEvent('hs-error', {
        detail: e.message,
      })
    );
  };

  ws.close = function () {};
}

/**
 * Displays QRCode and Login Button
 * @param {*} param0
 */
function formQRAndButtonHTML({ hsWalletBaseURL, hsLoginBtnDOM, hsLoginQRDOM, qrDataStr, hsloginBtnText }) {
  // Display the Login Button
  if (hsLoginBtnDOM) {
    const weblink = encodeURI(hsWalletBaseURL + '/deeplink?url=' + qrDataStr);
    hsLoginBtnDOM.innerHTML = `<button onclick="window.open('${weblink}', 'popUpWindow','height=800,width=400,left=100,top=100,resizable=yes,scrollbars=yes,toolbar=yes,menubar=no,location=no,directories=no, status=yes');">${hsloginBtnText}</button>`;
  }

  // TODO: Display the QR code to use with mobile app
  if (hsLoginQRDOM) {
    // display QR cod
    QRCode.toCanvas(hsLoginQRDOM, qrDataStr, function (error) {
      if (error) throw new Error(error);
    });
  }
}

/**
 *
 * @param {*} interval
 * @param {*} challenge
 * @returns
 */
function poll({ hsPollingInterval, challenge, sanitizeBaseUrl, sanitizePollResource }) {
  return new Promise(function (resolve, reject) {
    const ticker = setInterval(function () {
      const url = `${sanitizeBaseUrl}/${sanitizePollResource}?challenge=${challenge}`;
      return fetch(url)
        .then((res) => res.json())
        .then((json) => {
          const { hypersign } = json;
          const { success, data } = hypersign;
          if (success && success === true) {
            clearInterval(ticker);
            resolve(data);
          }
        })
        .catch((e) => {
          reject(e);
        });
    }, hsPollingInterval);
  });
}

/**
 *
 * @param {*} param0
 */
async function initiatePolling({
  rpBaseURL,
  hsLoginBtnDOM,
  hsLoginQRDOM,
  hsloginBtnText,
  hsWalletBaseURL,
  hsPollingInterval,
  rpChallengeResource,
  rpPollResource,
}) {
  // Url sanitization
  const sanitizeBaseUrl = rpBaseURL.endsWith('/') ? rpBaseURL.substr(0, rpBaseURL.length - 1) : rpBaseURL;
  const sanitizeChallengeResource = rpChallengeResource.startsWith('/')
    ? rpChallengeResource.substr(1, rpChallengeResource.length)
    : rpChallengeResource;
  const sanitizePollResource = rpPollResource.startsWith('/')
    ? rpPollResource.substr(1, rpPollResource.length)
    : rpPollResource;

  /// Fetch the challenge
  const url = `${sanitizeBaseUrl}/${sanitizeChallengeResource}`;
  const rs = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
    },
  });
  const js = await rs.json();
  const { hypersign } = js;
  const { data } = hypersign;
  const { challenge } = data;

  formQRAndButtonHTML({
    hsWalletBaseURL,
    hsLoginBtnDOM,
    hsLoginQRDOM,
    qrDataStr: JSON.stringify(data),
    hsloginBtnText,
  });

  if (challenge) {
    /// start the polling
    const x = await poll({ hsPollingInterval, challenge, sanitizeBaseUrl, sanitizePollResource });
    const { accessToken, refreshToken } = x;
    dispatchEvents({
      accessToken,
      refreshToken,
    });
  } else {
    throw new Error('HSAuth:: Could Not Fetch New Challenge from API');
  }
}

/**
 * Starts the program
 * @returns void
 */
function start() {
  try {
    let options = {
      LISTENER_MODE: document.currentScript.getAttribute('data-listener-mode')
        ? document.currentScript.getAttribute('data-listener-mode')
        : LISTENER_MODE_ENUM.SOCKET,
      RP_SOCKET_URL: document.currentScript.getAttribute('data-rp-socket-url'),
      RP_SERVER_BASEURL: document.currentScript.getAttribute('data-rp-server-base-url'),
      RP_CHALLENGE_RESOURCE: document.currentScript.getAttribute('data-rp-challege-resource')
        ? document.currentScript.getAttribute('data-rp-challege-resource')
        : '/api/v1/auth/challenge',
      RP_POLLING_RESOURCE: document.currentScript.getAttribute('data-rp-polling-resource')
        ? document.currentScript.getAttribute('data-rp-polling-resource')
        : '/api/v1/auth/poll',
      LOGIN_BUTTON_TEXT: document.currentScript.getAttribute('data-login-button-text')
        ? document.currentScript.getAttribute('data-login-button-text')
        : 'LOGIN USING HYPERSIGN',
      NETWORK_MODE: document.currentScript.getAttribute('data-network-mode')
        ? document.currentScript.getAttribute('data-network-mode')
        : ENV_ENUM.TEST,
      POLLING_INTERVAL: document.currentScript.getAttribute('data-polling-interval')
        ? parseInt(document.currentScript.getAttribute('data-polling-interval'))
        : 5000,
      HS_WALLET_BASEURL: '',
    };

    switch (options.NETWORK_MODE) {
      case ENV_ENUM.TEST: {
        options.HS_WALLET_BASEURL = 'https://hswallet-stage.netlify.app';
        break;
      }

      case ENV_ENUM.MAIN: {
        options.HS_WALLET_BASEURL = 'https://wallet.hypersign.id';
        break;
      }

      default: {
        throw new Error('HSAuth:: Invalid Network Mode');
      }
    }

    const { LISTENER_MODE } = options;

    const hsLoginBtnDOM = document.getElementById('hs-auth-btn');
    const hsLoginQRDOM = document.getElementById('hs-auth-qr');

    if (!hsLoginBtnDOM && !hsLoginQRDOM) {
      throw new Error("HSAuth:: No DOM Element Found With Id 'hs-auth-btn' or 'hs-auth-qr'");
    }

    switch (LISTENER_MODE) {
      case LISTENER_MODE_ENUM.SOCKET: {
        if (!checkForWebSocketSupport()) {
          throw new Error("HSAuth:: Sorry, Your Browser Doesn't Support WebSocket. Use Polling Instead.");
        }
        const { RP_SOCKET_URL } = options;
        if (!RP_SOCKET_URL) {
          throw new Error('HSAuth:: Relying Party Socket URL Must Be Passed for Websocket Mode');
        }
        const rpSocketParsedUrl = new URL(RP_SOCKET_URL);
        initiateSocket({
          rpServerSocketURL: rpSocketParsedUrl.href,
          hsLoginBtnDOM,
          hsLoginQRDOM,
          hsloginBtnText: options.LOGIN_BUTTON_TEXT,
          hsWalletBaseURL: options.HS_WALLET_BASEURL,
        });
        break;
      }

      case LISTENER_MODE_ENUM.POLLING: {
        let { RP_SERVER_BASEURL, POLLING_INTERVAL } = options;

        if (!RP_SERVER_BASEURL) {
          throw new Error('HSAuth:: Relying Party Base Url Must Be Passed For Polling Mode');
        }

        const rpBaseParsedUrl = new URL(RP_SERVER_BASEURL);

        initiatePolling({
          rpBaseURL: rpBaseParsedUrl.href,
          hsLoginBtnDOM,
          hsLoginQRDOM,
          hsloginBtnText: options.LOGIN_BUTTON_TEXT,
          hsWalletBaseURL: options.HS_WALLET_BASEURL,
          hsPollingInterval: POLLING_INTERVAL,
          rpChallengeResource: options.RP_CHALLENGE_RESOURCE,
          rpPollResource: options.RP_POLLING_RESOURCE,
        });
        break;
      }

      default: {
        throw new Error('HSAuth:: Invalid Listener Mode');
      }
    }
  } catch (e) {
    console.error(e.message);
  }
}

start();

const confirmEmail = (link) => {
  return `
  <heml>
    <head>
      <style>
      body {
        font-family: 'Inconsolata', monospace;
        background-color: #121212;
        padding: 48px 0px;
        line-height: 150%;
      }
      container {
        width: 100%;
        max-width: 480px;
        padding: 16px 24px;
        background: #2C2C2C;
        color: white;
        font-weight: 400;
        box-shadow: 0px 12px 32px rgba(0, 0, 0, 0.12);
        border-radius: 4px;
      }
      button {
        font-family: 'Inconsolata', monospace;
        padding: 8px 16px;
        font-style: normal;
        font-weight: 400;
        font-size: 16px;
        letter-spacing: .3px;
        line-height: 24px;
        text-align: center;
        background: #e13128;
        border-radius: 4px;
      }
      a {
        color: white;
        font-weight: 600;
      }
      </style>
    </head>
    <body>
      <container>
        <row style="margin-bottom: 8px">
          <col>
            <img style="width:60px; margin: auto" src="https://paras-media.s3-ap-southeast-1.amazonaws.com/Paras+Logo.png" />
          </col>
        </row>
        <row style="margin-bottom: 8px">
          <p>Hi there,</p>
          <p>You have successfully created a Paras account. Please click on the link below to verify your email address and complete your registration.</p>
        </row>
        <button style="margin-bottom: 36px" href="${link}">Confirm Email</button>
        <row>
          <p>If you have any question, feel free to ask us on <a href="mailto:hello@paras.id">hello@paras.id</a></p>
        </row>
      </container>
    </body>
  </heml>
  `
}

module.exports = confirmEmail
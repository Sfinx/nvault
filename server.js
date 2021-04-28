
import fs from 'fs'
import { LocalStorage } from 'node-localstorage'
import restify from 'restify'
import * as OTPAuth from 'otpauth'
import qrcode from 'qrcode-terminal'

let db = new LocalStorage('./nvault.db')
let users = JSON.parse(db.getItem('users') || '{}')
let secrets = JSON.parse(db.getItem('secrets') || '{}')
let updateDb = (a) => { db.setItem(a, JSON.stringify(eval(a))) }
let rootOTP

function randomBase32(length) {
 let base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
 length = length % 2 === 0 ? length : length + 1; // ensuring even length
 let secret = [];
 for (let i = 0; i < length; i++) {
  secret.push(base32chars.split('')[Math.floor(Math.random() * 32)]);
 }
 return secret.join('');
}

if (!users?.root) {
  let secret = randomBase32(32)
  rootOTP = new OTPAuth.TOTP({
	issuer: 'nvault',
	label: 'Root Token',
	algorithm: 'SHA1',
	digits: 6,
	period: 30,
	secret
  })
  users.root = secret
  updateDb('users')
  let uri = rootOTP.toString()
  console.log(`Created user root with token: ${users.root}, URI: ${uri}`)
  qrcode.generate(uri, { small: true })
} else
    rootOTP = new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: users.root
  })

let getSecret = (req, res, next) => {
  let user = req.headers['token-user']
  let secretID = req.headers['secret-id']
  let totpToken = req.headers['totp-token']
  if (!user?.length || !secretID?.length || !totpToken?.length)
    res.send(503)
  else {
    let otp = new OTPAuth.TOTP({
	algorithm: 'SHA1',
	digits: 6,
	period: 30,
	secret: users[user].secret
    })
    let token = otp.generate()
    let delta = otp.validate({
     token: totpToken,
     window: 1
    })  
    if (token != totpToken) {
      console.log('getSecret: Wrong token for', user, token, totpToken)
      res.send(503)
    } else
      //res.send({
      //  secret: secrets[userAllowedRealm].[secretID]
      //})
      res.send(secrets[user].[secretID])
  }
  res.end()
  return next(false)
}

let createUser = (req, res, next) => {
  let user = req.headers['token-user']
  if (!user?.length)
    res.send(503)
  else {
    let secret = randomBase32(32)
    let otp = new OTPAuth.TOTP({
	issuer: 'nvault',
	label: `${user}@${realm} Token`,
	algorithm: 'SHA1',
	digits: 6,
	period: 30,
	secret
    })
    users[user] = {
      secret
    }
   let uri = otp.toString()
   console.log(`Created user ${user} with token: ${users[user].secret}, URI: ${uri}`)
   qrcode.generate(uri, { small: true })   
   updateDb('users')
  }
  res.end()
  return next(false)
}

let setSecret = (req, res, next) => {
  let secretID = req.headers['secret-id']
  let secret = req.headers['secret']
  let rootToken = rootOTP.generate()
  let totpToken = req.headers['totp-token']
  let delta = rootOTP.validate({
   token: totpToken,
   window: 1
  })
  if (req.headers['token-user'] != 'root' || totpToken != rootToken || !secretID?.length || !secret?.length) {
    console.log('Invalid root OTP token !', totpToken, rootToken)
    res.send(503)
  } else {
    if (!secrets[user])
      secrets[user] = {}
    secrets[user].[secretID] = secret
    console.log(`Secret '${secret}' with ID '${secretID}' is set for '${user}'`)
    updateDb('secrets')
  }
  res.end()
  return next(false)
}

let options = {
  key: fs.readFileSync('./snakeoil.key'),
  certificate: fs.readFileSync('./snakeoil.crt'),
  name: 'nvault',
  version: '1.0.0'
}

let server = restify.createServer(options)

server.use(restify.plugins.bodyParser({
 mapParams: true
}))

server.use(restify.plugins.acceptParser(server.acceptable))

server.post('/createUser', createUser)
server.post('/getSecret', getSecret)
server.post('/setSecret', setSecret)

server.listen(8443, () => {
  console.log('%s listening at %s', server.name, server.url)
})

import { Amplify } from "aws-amplify";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "us-east-1_qzuxmGVC5",
      userPoolClientId: "249f5ljp338h1ik98ksoc85l1t",
    },
  },

  API: {
    GraphQL: {
      endpoint:
        "https://ldynidvuh5ahjfmm4mevbce5ma.appsync-api.us-east-1.amazonaws.com/graphql",
      region: "us-east-1",
      defaultAuthMode: "userPool",
    },
  },
});
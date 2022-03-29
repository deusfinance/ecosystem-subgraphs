# DEUS Ecosystem Subgraphs

This repository houses subgraphs for the following categories:

- Synchronizer
- DEUS Token
- DEI Token
- Borrowing
- veDEUS

### Get Started

Run `yarn install -g @graphprotocol/graph-cli` in order to interact with TheGraph Network. Then run `yarn install` to install dependencies.

#### Running

You need to run `yarn prepare:fantom` everytime you make changes to template.yaml files and/or config files, naturally 'fantom' can be any chain. When deploying, make sure you rerun this command as well for said chains. Before deployments, run `yarn codegen` to compile.

#### Authentication & Deployments

Run `graph auth --product hosted-service <ACCESS_TOKEN>` to set your deployment key, you only have to do this once on your local machine. To deploy your subgraph run `graph deploy --product hosted-service <GITHUB_USER>/<SUBGRAPH NAME>`

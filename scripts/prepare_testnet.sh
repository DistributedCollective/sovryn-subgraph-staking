export NETWORK=testnet;
red=`tput setaf 1`
yellow=`tput setaf 3`
green=`tput setaf 2`
reset=`tput sgr0`
echo "Preparing subgraph for ${yellow}$NETWORK${reset} network" && echo;
npx mustache config/RSK.testnet.json subgraph.template.yaml > subgraph.yaml;
echo "File: ${green}subgraph.yaml${reset} has been mustached";
npx mustache config/RSK.testnet.json docker-compose.template.yml > docker-compose.yml;
echo "File: ${green}docker-compose.yml${reset} has been mustached";
npx mustache config/RSK.testnet.json src/config/contracts.template.ts > src/config/contracts.ts;
echo "File: ${green}src/config/contracts.ts${reset} has been mustached";
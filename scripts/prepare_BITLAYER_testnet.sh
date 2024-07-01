export NETWORK=testnet;
red=`tput setaf 1`
yellow=`tput setaf 3`
green=`tput setaf 2`
reset=`tput sgr0`
echo "Preparing subgraph for ${yellow}$NETWORK${reset} network" && echo;
npx mustache config/BITLAYER.testnet.json subgraph.template.yaml > subgraph.yaml;
echo "File: ${green}subgraph.yaml${reset} has been mustached";
npx mustache config/BITLAYER.testnet.json docker-compose.template.yml > docker-compose.yml;
echo "File: ${green}docker-compose.yml${reset} has been mustached";
npx mustache config/BITLAYER.testnet.json src/constants.template.ts > src/constants.ts;

echo "File: ${green}src/config/contracts.ts${reset} has been mustached";

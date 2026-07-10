import fs from "fs-extra";

export function getContracts() {
  const network = process.env.DEPLOYMENT_NETWORK || "arcTestnet";
  return fs.readJSONSync(`./deployments/${network}.json`);
}

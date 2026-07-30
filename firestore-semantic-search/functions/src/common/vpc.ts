/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// import {VpcAccessServiceClient} from '@google-cloud/vpc-access';
// import {google} from 'googleapis';

// import config from '../config';

// const compute = google.compute('v1');
// const auth = new google.auth.GoogleAuth({
//   scopes: [
//     'https://www.googleapis.com/auth/cloud-platform',
//     'https://www.googleapis.com/auth/compute',
//   ],
// });
// const vpcaccessClient = new VpcAccessServiceClient({auth: auth});

// /**
//  * Creates a VPC network & connector for the project.
//  */
// export async function setupVPCNetwork() {
//   const network = '';

//   await compute.networks.insert({
//     auth: await auth.getClient(),
//     project: config.projectId,
//     requestBody: {
//       name: network,
//       autoCreateSubnetworks: true,
//       peerings: [
//         {
//           name: 'vpc-access-connector',
//           network: `projects/${config.projectId}/global/networks/${network}`,
//         },
//       ],
//     },
//   });
//   const [operation] = await vpcaccessClient.createConnector({
//     parent: `projects/${config.projectId}/locations/${config.location}`,
//     connectorId: 'ext-connector',
//     connector: {
//       connectedProjects: [config.projectId],
//       network: network,
//       ipCidrRange: '10.8.0.0/28',
//       maxInstances: 3,
//       minInstances: 2,
//     },
//   });
//   const [response] = await operation.promise();

//   return response;
// }

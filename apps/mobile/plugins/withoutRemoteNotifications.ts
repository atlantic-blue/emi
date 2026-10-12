import { type ConfigPlugin, withEntitlementsPlist } from 'expo/config-plugins';

/**
 * Emi raises one notification, which this phone schedules for itself. The plugin of
 * expo-notifications also gives the application the push entitlement, which is what lets a server
 * reach the phone. Emi has no server that sends one, so the entitlement is taken off again and the
 * build carries no way for a notification to arrive from outside the phone.
 */
const withoutRemoteNotifications: ConfigPlugin = (config) =>
  withEntitlementsPlist(config, (entitled) => {
    delete entitled.modResults['aps-environment'];
    return entitled;
  });

export default withoutRemoteNotifications;

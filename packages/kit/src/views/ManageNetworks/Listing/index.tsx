import React, { FC, useCallback, useMemo, useState } from 'react';

import { useNavigation } from '@react-navigation/core';
import { useFocusEffect } from '@react-navigation/native';
import { useIntl } from 'react-intl';

import {
  Badge,
  Center,
  Empty,
  List,
  ListItem,
  Modal,
  Pressable,
  Searchbar,
  Switch,
  useIsVerticalLayout,
} from '@onekeyhq/components';
import { Network } from '@onekeyhq/engine/src/types/network';

import backgroundApiProxy from '../../../background/instance/backgroundApiProxy';
import { useManageNetworks } from '../../../hooks';
import { useActiveWalletAccount } from '../../../hooks/redux';
import {
  ManageNetworkRoutes,
  ManageNetworkRoutesParams,
} from '../../../routes/Modal/ManageNetwork';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProps = NativeStackNavigationProp<
  ManageNetworkRoutesParams,
  ManageNetworkRoutes.Listing
>;

export const Listing: FC = () => {
  const intl = useIntl();
  const isSmallScreen = useIsVerticalLayout();
  const { allNetworks } = useManageNetworks();
  const [search, setSearch] = useState('');
  const navigation = useNavigation<NavigationProps>();
  const { network: activeNetwork } = useActiveWalletAccount();

  const data = useMemo(
    () =>
      allNetworks.filter(
        (d) =>
          d.name.toLowerCase().includes(search.toLowerCase()) ||
          d.shortName.toLowerCase().includes(search.toLowerCase()),
      ),
    [allNetworks, search],
  );

  const handleToggle = useCallback(
    (network: Network) => {
      backgroundApiProxy.serviceNetwork.updateNetworks(
        allNetworks.map((n) => [
          n.id,
          n.id === network.id ? !n.enabled : n.enabled,
        ]),
      );
    },
    [allNetworks],
  );

  const onPress = useCallback(
    (network?: Network, mode: 'edit' | 'add' = 'add') => {
      navigation.navigate(ManageNetworkRoutes.AddNetwork, { network, mode });
    },
    [navigation],
  );

  useFocusEffect(
    useCallback(() => {
      setSearch('');
    }, []),
  );

  return (
    <Modal
      header={intl.formatMessage({ id: 'action__customize_network' })}
      height="560px"
      hideSecondaryAction
      primaryActionProps={{
        type: 'primary',
        w: isSmallScreen ? 'full' : undefined,
      }}
      primaryActionTranslationId="action__add_custom_chain"
      onPrimaryActionPress={() => onPress()}
    >
      <Searchbar
        w="full"
        value={search}
        mb="4"
        onChangeText={(text) => setSearch(text)}
        placeholder={intl.formatMessage({ id: 'content__search' })}
        onClear={() => setSearch('')}
      />
      {data.length > 0 ? (
        <List
          data={data}
          renderItem={({ item }) => (
            <ListItem
              flex={1}
              onPress={item.preset ? undefined : () => onPress(item, 'edit')}
            >
              <ListItem.Column
                image={{ src: item.logoURI, borderRadius: 'full', size: 8 }}
              />
              <ListItem.Column
                text={{
                  label: item.name,
                }}
                flex={1}
              />
              <ListItem.Column
                text={{
                  label: <Badge size="sm" title={item.impl.toUpperCase()} />,
                }}
              />
              <ListItem.Column
                text={{
                  label: (
                    <Pressable>
                      <Switch
                        isDisabled={item.id === activeNetwork?.id}
                        isChecked={item.enabled}
                        labelType="false"
                        onToggle={() => handleToggle(item)}
                      />
                    </Pressable>
                  ),
                }}
                alignItems="flex-end"
              />
            </ListItem>
          )}
          keyExtractor={(item) => item.id}
        />
      ) : (
        <Center h="full">
          <Empty
            emoji="🔍"
            title={intl.formatMessage({
              id: 'content__no_results',
              defaultMessage: 'No Result',
            })}
          />
        </Center>
      )}
    </Modal>
  );
};

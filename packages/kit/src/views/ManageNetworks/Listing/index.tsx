import type { FC } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useNavigation } from '@react-navigation/core';
import { useFocusEffect } from '@react-navigation/native';
import { debounce } from 'lodash';
import { useIntl } from 'react-intl';

import {
  Badge,
  Center,
  Empty,
  List,
  ListItem,
  Modal,
  Searchbar,
  Switch,
  Token,
  useIsVerticalLayout,
} from '@onekeyhq/components';
import type { Network } from '@onekeyhq/engine/src/types/network';

import backgroundApiProxy from '../../../background/instance/backgroundApiProxy';
import { getActiveWalletAccount } from '../../../hooks/redux';
import { getManageNetworks } from '../../../hooks/useManageNetworks';
import { ManageNetworkRoutes } from '../../../routes/Modal/ManageNetwork';

import type { ManageNetworkRoutesParams } from '../../../routes/Modal/ManageNetwork';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProps = NativeStackNavigationProp<
  ManageNetworkRoutesParams,
  ManageNetworkRoutes.Listing
>;

const updateNetworks = debounce(
  (params: [string, boolean][]) => {
    backgroundApiProxy.serviceNetwork.updateNetworks(params);
  },
  1000,
  {
    leading: false,
    trailing: true,
  },
);

const NetworkItem: FC<{
  item: Network;
  onLabelPress?: () => void;
  isDisabled?: boolean;
  onToggle: (item: Network) => void;
}> = ({ item, onLabelPress, isDisabled, onToggle }) => {
  const [checked, setChecked] = useState(item.enabled);
  const handleToggle = useCallback(
    (network: Network) => {
      setChecked((v) => !v);
      onToggle(network);
    },
    [onToggle],
  );
  return (
    <ListItem flex={1} onPress={onLabelPress}>
      <ListItem.Column>
        <Token
          size={8}
          token={{
            logoURI: item.logoURI,
            name: item.name,
            symbol: item.name,
          }}
        />
      </ListItem.Column>
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
            <Switch
              isDisabled={isDisabled}
              isChecked={checked}
              labelType="false"
              onToggle={() => handleToggle(item)}
            />
          ),
        }}
        alignItems="flex-end"
      />
    </ListItem>
  );
};

export const Listing: FC = () => {
  const intl = useIntl();
  const isSmallScreen = useIsVerticalLayout();
  const [allNetworks, setAllNetworks] = useState(
    getManageNetworks().allNetworks,
  );
  const [search, setSearch] = useState('');
  const navigation = useNavigation<NavigationProps>();
  const [activeNetwork, setActiveNetwork] = useState(
    getActiveWalletAccount().network,
  );

  const allNetworkRefList = useRef<[string, boolean][]>(
    getManageNetworks().allNetworks.map((n) => [n.id, n.enabled]),
  );

  const data = useMemo(
    () =>
      allNetworks.filter(
        (d) =>
          d.name.toLowerCase().includes(search.toLowerCase()) ||
          d.shortName.toLowerCase().includes(search.toLowerCase()),
      ),
    [allNetworks, search],
  );

  const onPress = useCallback(
    (network?: Network, mode: 'edit' | 'add' = 'add') => {
      navigation.navigate(ManageNetworkRoutes.AddNetwork, { network, mode });
    },
    [navigation],
  );

  const onToggle = useCallback((item: Network) => {
    allNetworkRefList.current = allNetworkRefList.current.map((n) => {
      if (n[0] === item.id) {
        return [n[0], !n[1]];
      }
      return n;
    });
    updateNetworks(allNetworkRefList.current);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setSearch('');
      setAllNetworks(getManageNetworks().allNetworks);
      setActiveNetwork(getActiveWalletAccount().network);
    }, []),
  );

  const emptyComponent = useCallback(
    () => (
      <Center h="full">
        <Empty
          emoji="🔍"
          title={intl.formatMessage({
            id: 'content__no_results',
            defaultMessage: 'No Result',
          })}
        />
      </Center>
    ),
    [intl],
  );

  const renderItem = useCallback(
    ({ item }: { item: Network }) => (
      <NetworkItem
        onLabelPress={item.preset ? undefined : () => onPress(item, 'edit')}
        item={item}
        isDisabled={item.id === activeNetwork?.id}
        onToggle={onToggle}
      />
    ),
    [activeNetwork, onPress, onToggle],
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
      primaryActionTranslationId="action__add_network"
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
      <List
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={emptyComponent}
      />
    </Modal>
  );
};

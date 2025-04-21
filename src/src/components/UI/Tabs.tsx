import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import styles from '../../assets/styles/components.module.scss';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultValue?: string;
  className?: string;
  onChange?: (value: string) => void;
}

const Tabs = ({
  tabs,
  defaultValue,
  className = '',
  onChange,
}: TabsProps) => {
  return (
    <TabsPrimitive.Root
      defaultValue={defaultValue || tabs[0].id}
      className={`${styles.tabsRoot} ${className}`}
      onValueChange={onChange}
    >
      <TabsPrimitive.List className={styles.tabsList}>
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.id}
            value={tab.id}
            className={styles.tabsTrigger}
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((tab) => (
        <TabsPrimitive.Content
          key={tab.id}
          value={tab.id}
          className={styles.tabsContent}
        >
          {tab.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
};

export default Tabs; 
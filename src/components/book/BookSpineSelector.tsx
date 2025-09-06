import React, { useMemo } from 'react';
import { NormSpineItem } from '@/hooks/book/useSpine';
import { Accordion, AccordionItem } from '@heroui/react';
import { RadioGroup, Radio } from '@heroui/react';

interface SpineItemSelectorProps {
  item: NormSpineItem;
  value: string;
  onSelect: (item: NormSpineItem) => void;
}
const SpineItemSelector = ({
  item,
  value,
  onSelect,
}: SpineItemSelectorProps) => {
  if (item.children.length <= 0) {
    return null;
  }
  return (
    <Accordion>
      {item.children.map((child) => (
        <AccordionItem
          key={child.id}
          hideIndicator={child.children.length <= 0}
          title={<Radio value={child.id}>{child.title}</Radio>}
        >
          <SpineItemSelector item={child} value={value} onSelect={onSelect} />
        </AccordionItem>
      ))}
    </Accordion>
  );
};

interface BookSpineSelectorProps {
  items: NormSpineItem[];
  value: string;
  onSelect: (item: NormSpineItem) => void;
}
const BookSpineSelector = ({
  items,
  value,
  onSelect,
}: BookSpineSelectorProps) => {
  console.log('selector value', value);
  // traverse the items in DFS and get a map from id to item
  const itemMap = useMemo(() => {
    const idToItem = new Map<string, NormSpineItem>();
    const traverse = (item: NormSpineItem) => {
      idToItem.set(item.id, item);
      item.children.forEach(traverse);
    };
    items.forEach(traverse);
    return idToItem;
  }, [items]);
  return (
    <RadioGroup
      value={value}
      onValueChange={(value) => onSelect(itemMap.get(value) ?? null)}
    >
      <Accordion>
        {items.map((item) => (
          <AccordionItem
            key={item.id}
            hideIndicator={item.children.length <= 0}
            disableAnimation={item.children.length <= 0}
            title={<Radio value={item.id}>{item.title}</Radio>}
          >
            {item.children.length > 0 ? <SpineItemSelector item={item} value={value} onSelect={onSelect} /> : null}
          </AccordionItem>
        ))}
      </Accordion>
    </RadioGroup>
  );
};

export default BookSpineSelector;

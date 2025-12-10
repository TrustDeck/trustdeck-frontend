import { useTranslation } from "react-i18next";

export function useRelationshipOptions() {
  const { t } = useTranslation();

  return [
    { label: t('identity:entity.person.relationship.partner'), value: 'partner' },
    { label: t('identity:entity.person.relationship.parent'), value: 'parent' },
    { label: t('identity:entity.person.relationship.child'), value: 'child' },
    { label: t('identity:entity.person.relationship.sibling'), value: 'sibling' },
    { label: t('identity:entity.person.relationship.grandparent'), value: 'grandparent' },
    { label: t('identity:entity.person.relationship.auntUncle'), value: 'aunt_uncle' },
    { label: t('identity:entity.person.relationship.nieceNephew'), value: 'niece_nephew' },
    { label: t('identity:entity.person.relationship.cousin'), value: 'cousin' },
    { label: t('identity:entity.person.relationship.friend'), value: 'friend' }
  ];
}

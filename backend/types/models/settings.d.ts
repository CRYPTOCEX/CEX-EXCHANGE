


interface settingsAttributes {
  key: string;
  value: string | null;
}

type settingsPk = "key";
type settingsId = settingsAttributes[settingsPk];
type settingsCreationAttributes = settingsAttributes;

# Change Log

## 1.0.0

* Initial release

## 1.0.1 
- now disallows create/update action scenario fields contain duplicates
  - indicates with colors and tooltip what should be fixed
- Alphabetical ordering of scenarios
  - When 'update', the 'existing scenarios' now show in alphabetical order
  - When 'create' or 'update', scenarios are written to integration script file in alphabetical order

## 1.1.0
- Added new 'Create Postman Collection' dashboard
- Updated 'Create or update integration' logic
  - Dashboard now fully compatible with existing integrations and ps1 scripts
  - On 'update': retrieves existing scenarios now by comparing local scenario folders with availble scenario xmls (or xml-elements, when modular)
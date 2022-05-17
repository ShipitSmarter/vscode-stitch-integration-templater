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

# 1.2.0
- Postman collection
  - Added option to generate Postman collections completely independent of existing carrier integrations
    - Including specification of pre-defined or modular scenarios
    - Allows picking of carrier as specified in translation file
  - Added input fields:
    - 'arrier Code:  readonly, linked to carrier
    - Account number: specify sender party account number
    - CostCenter: specify cost center
  - Updated header fields:
    - Added CustomerHandlingAgent (can be deleted)
    - Updated CodeCompany value to be adjustable (but auto-filled every time customer is selected from dropdown)
- Carrier integration
  - On 'update'
    - scenario dropdowns now only show scenarios which are not already in the list of existing scenarios
    - Added 'check all' checkbox to check/uncheck all existing scenarios at once
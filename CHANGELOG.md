# Change Log

## 1.3.1
- Modular Scenarios (general)
  - Modular scenario fields can now only be updated using the tiles (no more free typing)
  - Focused scenario field is highlighted in blue
  - Modular scenario names auto-start with 'm-'
    - This facilitates the updated PowerShell script to auto-determine scenario modularity
  - When updating existing integrations, switching 'modular' checkbox is no longer restricted
    - Mixing new modular with existing non-modular scenarios is now allowed
    - When loading existing integration, modular checkbox is no longer updated
    - When loading existing integration, scenario fields are no longer cleared
  - Refactor: PowerShell script no longer needs 'Modular' flag input -> Modularity is determined on scenario level

## 1.3.0
- Carrier Integration & Postman Collection
  - Modular scenario creation
    - Added option to create scenarios by selecting/deselecting tiles
    - Now also checks for doubles in new and existing modular scenarios
  - Minor style updates

## 1.2.3
- Postman collection
  - Refactor for performance improvement
  - Collection file and name now contain carrier code instead of carrier name to avoid invalid paths

## 1.2.2
- Postman collection
  - Bugfix: dropdown doubles after using 'Refresh' button

## 1.2.1
- Postman collection
  - Added 'Refresh' button to allow refreshing of all dropdown (and modular) options without needing to close and reopen dashboard.

## 1.2.0
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

## 1.1.0
- Added new 'Create Postman Collection' dashboard
- Updated 'Create or update integration' logic
  - Dashboard now fully compatible with existing integrations and ps1 scripts
  - On 'update': retrieves existing scenarios now by comparing local scenario folders with availble scenario xmls (or xml-elements, when modular)

## 1.0.1 
- now disallows create/update action scenario fields contain duplicates
  - indicates with colors and tooltip what should be fixed
- Alphabetical ordering of scenarios
  - When 'update', the 'existing scenarios' now show in alphabetical order
  - When 'create' or 'update', scenarios are written to integration script file in alphabetical order

## 1.0.0

* Initial release






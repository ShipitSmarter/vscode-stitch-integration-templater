# Change Log

## 1.6.0
- Get/set Parameters
  - Added new Get/set Parameters panel, allowing mass check and change of SiS parameters, by either uploading a CSV file, or manual input.

## 1.5.4
- Carrier integration
  - 'Check' button click now does a full refresh
    - Pro: takes into account scenario renaming
    - Con: hitting 'check' takes a couple of seconds
- Scenarios
  - For both integration and Postman collection, new scenarios can only be modular
  - For integration, fixed scenarios may still show up as 'existing scenarios' and may still be re-run

## 1.5.3
- Carrier Integration
  - style: increased existing scenario name fields for clarity

## 1.5.2
- Postman collection
  - fix: now correctly loads number of packages fields from existing postman collection file

## 1.5.1
- Modular scenarios
  - Now allows customised modular scenario names
  - Now allows multiple modular tiles with the same name (as long as they are in different subfolders)
  - Integration: existing scenarios
    - Now shows which existing scenarios are modular (since cannot be deduced anymore from name)
    - When existing modular scenario is checked, selecting the existing scenario name field will show which modular tiles it consists of

- fix
  - Now checks if new fixed scenario is not selected twice
  - Integration: now hides carrier code field on 'update'
- style
  - Integration: on 'update', existing scenarios are now on the left, right under the carrier details

## 1.5.0 
- Integration
  - Removed unused fields (urls, apy description, test user/pwd)
  - Added option to specify step types (http, sftp, mail, render) and for http, specify method (post, get, delete) in step names
  - Gets dropdown options (module, steps, step types, step methods) now from file in scenario-templates/templater/integration

## 1.4.1 
- Postman Collection
  - Added option to load existing Postman Collection file
    * Only if compatible (i.e. generated using the appropriate PowerShell script version)

## 1.4.0 
- Modular Scenarios (general)
  - Modular scenario generation is now multi-package compatible
    - Supports up to 9 packages per scenario
    - Number of packages settable per scenario
      - Auto-adds and updates `multi` element with set number of packages to each scenario
    - Auto-detects which elements contain a `<ShipmentPackage>` node, and auto-adds package indices field upon tile selection
    - Field value checks on scenario and package indices field levels
      - checks if package indices between 1 and scenario-set number of packages, and no doubles present (and not empty)
      - Adds appropriate red field outline and hover-over tooltips
      - Does not allow integration creation/update or postman collection creation if any invalid fields
  - Updated tile view
    - Now lined up vertically to the right of the scenario list, with parent folder name auto-added as tile list header
    - Any element in root folder is not shown (reserved for auto-added elements like `m` and `multi`)

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






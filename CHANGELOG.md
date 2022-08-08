# Change Log

## 1.6.15
- Get/set parameters
  - Now clears get/set responses and previous values when:
    - company, customer or parameter name is updated
    - environment is changed
    - new value is updated (only `set` response is cleared)
  - Fix:
    - Now allows input of new values that contain pipes '`|`'
    - Parameter dropdowns
      - Highlight red when company/customer/parameter line is duplicate
      - Disable while using `get` or `set` button
    - Check if current and new values match on updating new value field

## 1.6.14
- Get/set parameters
  - Added option to navigate through the `Parameter inputs` grid using `Ctrl` + `up`/`down`/`left`/`right` arrow keys

## 1.6.13
- Get/set parameters
  - Style
    - Link to documentation now shows as `info` badge (blue, next to panel header)
    - Aligned get/set responses' colors with VSCode theme
    - Fix: when selecting `PROD` environment, red hue of background and dropdown is now based on VSCode theme
      - NOTE: if VSCode theme is changed, `get/set parameters` panel needs to be reopened for the `PROD` coloring to align
  - Workspace setting `stitch.parameters.readmeLocation` can now contain either glob to local markdown file OR a url to an external web page

## 1.6.12
- Get/set parameters
  - Now gets tool readme location glob from repo setting `stitch.parameters.readmeLocation` (and shows error if setting is not present)

## 1.6.11
- Get/set parameters
  - Save file
    - Show save folder/file name next to input field
  - Load file
    - On file load, set same file as save location
    - Fix: on file load, clear get/set responses, parameter code dropdowns
  - parameter code dropdown
    - Fix: don't close dropdown when refreshing window or opening another dropdown
    - Show dropdown value on hover-over
  - Allow deletion of specific line on `Ctrl` + `Delete` anywhere in the line
  - Show (`i`) information badge next to panel title and link to local introduction documentation in repo


## 1.6.10
- Get/set parameters
  - Authentication is now through setting 'Stitch: Basic Authentication String'. Removed auth input fields and file creation logic.

## 1.6.9
- Get/set parameters
  - Update authentication
    - credentials taken from user input or file, allows saving by user
    - File location is separate from other settings, so can be gitignored

## 1.6.8
- Get/set parameters
  - Removed explicit load options. From now on, load from right-mouse-click in explorer menu.
  - When parameter option is selected, no longer necessary to switch back to field using `Ctrl` + `Enter`. Get/Set will work right away. To continue search, one still can press `Ctrl` + `Enter` and update the parameter manually.

## 1.6.7
- Get/set parameters
  - Save input
    - If `Save folder` field contains a file location, hitting `Save input` now saves to file (instead of creating a new file every time)
    - Saving input can now be triggered by hitting `Ctrl` + `S`
  - Load file
    - A CSV file can now be loaded by right-clicking on it in the explorer menu and selecting `Load to 'get/set parameters'`
      - Can also be used if no `get/set parameters` panel has been opened yet. If the panel is already present, file will load to that one.
      - Note: only works if .vscode/settings.json has setting `stitch.parameters.enabled` = `true`
  
  - Fix:
    - Empty values are now saved as empty string instead of 'undefined'
    - On adding one or multiple lines, last unempty company/customer/change reason values are now correctly copied to all empty fields following
    - Current values are now correctly shown if they contain html sensitive characters
    - CSV file load splits file lines on `\n` instead of `\r\n`
    - parameter options dropdown now correctly matches theme colors

## 1.6.6
- Get/set parameters
  - Horizontal tabbing through input fields
  - auto-fill company, customer and change reason fields when adding new lines
  - Add new line on `Ctrl` + `Enter` in last-line new parameter value or change reason fields
  - On adding new line(s), auto-place cursor and focus to appropriate field in next line
  - On 'get' and 'set', check on remaining parameter name option dropdowns which have not been selected with `Ctrl` + `Enter` yet

## 1.6.5
- Get/set parameters
  - Allow searching for existing parameters by pressing `Enter` on parameter name field, and confirming choice from dropdown by pressing `Ctrl` + `Enter`

## 1.6.4
- Get/set Parameters
  - Fix: Unable to get/set parameters if not set for given company/customer combination
    - 'Get' now first calls parameter service; if exists, retrieves history
  - Always show file load field and button


## 1.6.3
- Get/set Parameters
  - Show company name on hover-over
  - Clears previous get/set responses on load, set actions
  - Updates environment if present in loaded CSV file name
  - Checks and shows if company/customer/parameter combination is duplicate
  - Shows change reason and timestamp in get response
  - Shows last 5 changes on timestamp hover-over

## 1.6.2
- Get/set Parameters
  - Added 'save current input' button
  - Added field for updating all change reason fields at once
  - Now disables fields and buttons and shows waiting icon when processing 'get' or 'set' request
  - Fix: when environment is 'PROD' and updating panel by clicking other buttons, environment dropdown and panel background stay red

## 1.6.1
- Get/set Parameters
  - When Environment dropdown set to 'PROD', color dropdown bright red and panel background dark red
  - On pressing 'Set Parameter' button
    - Add environment name to saved file
    - Update input layout and highlight, uncheck 'previous' checkbox, clear previous Get/Set responses and current values
- Add highlight to current value fields which are unequal to new values (or previous values, if 'previous' checkbox is set)

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






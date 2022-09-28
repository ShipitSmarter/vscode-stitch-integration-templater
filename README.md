# Stitch integration templater

[![](https://vsmarketplacebadge.apphb.com/version-short/shipitsmarter.stitch-integration-templater.svg)](https://marketplace.visualstudio.com/items?itemName=shipitsmarter.stitch-integration-templater)
[![](https://vsmarketplacebadge.apphb.com/installs-short/shipitsmarter.stitch-integration-templater.svg)](https://marketplace.visualstudio.com/items?itemName=shipitsmarter.stitch-integration-templater)
[![](https://vsmarketplacebadge.apphb.com/rating-short/shipitsmarter.stitch-integration-templater.svg)](https://marketplace.visualstudio.com/items?itemName=shipitsmarter.stitch-integration-templater)



This is a vscode extension to help start a new Stitch carrier integration, or update an existing one with new scenarios.

## Commands

Contributes the following commands, which are available from the *Command Palette* (`Ctrl`+`Shift`+`P`):

### `Stitch: Create or update carrier integration`
- Dashboard for creating new or updating existing Stitch carrier integration.

    ![Stitch integration templater](https://raw.githubusercontent.com/shipitsmarter/vscode-stitch-integration-templater/main/img/sit-use-gif.gif)

    When updating an existing integration, it is possible to add new steps to the `*.integration.json` file using the dashboard:

    ![Add steps to existing integration](https://raw.githubusercontent.com/shipitsmarter/vscode-stitch-integration-templater/main/img/add-steps-to-existing-integration.gif)

    It is possible to load an existing integration (if compatible) to the dashboard by right-clicking the associated `*.integration.json` file and selecting option `Load file to create/update integration panel`:

    ![Load file to create/update integration panel]((https://raw.githubusercontent.com/shipitsmarter/vscode-stitch-integration-templater/main/img/load-file-to-create-update-integration-panel.png)

    Note: to enable this button, `.vscode/settings.json` must have setting `stich.integrationtemplater.enabled` = `true`.

### `Stitch: Create Postman collection`
- Dashboard for easily generating a postman collection file from an existing scenario.

    ![Stitch Create Postman collection](https://raw.githubusercontent.com/shipitsmarter/vscode-stitch-integration-templater/main/img/pmcollection-use-gif.gif)


### Modular scenarios
- Both Integration and Postman collection panels allow you to create modular scenarios using tile and package type selection:

    ![Modular tiles](https://raw.githubusercontent.com/shipitsmarter/vscode-stitch-integration-templater/main/img/scenariotiles-use-gif.gif)

### `Stitch: Get/Set parameters`
- Dashboard for mass check and update of SiS parameters, either by uploading a CSV, or by manual input.

    ![Get Set Parameters](https://raw.githubusercontent.com/shipitsmarter/vscode-stitch-integration-templater/main/img/get_set_parameters_use.png)


    In order to load a CSV file, select `Load file to 'get/set parameters'` from the right-mouse-menu in the Explorer sidebar to load it directly to a new or existing instance of the panel:
    
    ![Load CSV file to get/set parameters](https://raw.githubusercontent.com/shipitsmarter/vscode-stitch-integration-templater/main/img/load_file_to_get_set_parameters.png)


    Note: to enable this, `.vscode/settings.json` must have setting `stich.parameters.enabled` = `true`.

## Right-mouse-menu button: `Sort Scriban functions file`
- In order to sort functions alphabetically in a given Scriban file (using the ShipitSmarter integration automation PowerShell script), right-click on a given Scriban file and select `Sort Scriban functions file`:

    ![Sort Scriban functions file](https://raw.githubusercontent.com/shipitsmarter/vscode-stitch-integration-templater/main/img/sort_scriban_functions_file.png)


    Note: to enable this, `.vscode/settings.json` must have setting `stich.sortscriban.enabled` = `true`.

### Setting: `Stitch: Basic Authentication String`
- In order for API calls to SiS APIs from the extension to work, one must update the setting through `Ctrl` + `,` -> `Stitch: Basic Authentication String`: 

    ![Stitch Basic Authentication String](https://raw.githubusercontent.com/shipitsmarter/vscode-stitch-integration-templater/main/img/stitch_basic_auth_string_setting.png)


## Dependencies
This dashboard is a graphical frontend for the ShipitSmarter integration automation PowerShell script, and does not function independently without it.

## Change Log
See Change Log [here](CHANGELOG.md)

## Issues
Submit the [issues](https://github.com/shipitsmarter/vscode-stitch-integration-templater/issues) if you find any bug or have any suggestion.

## Contribution
Fork the [repo](https://github.com/shipitsmarter/vscode-stitch-integration-templater/) and submit pull requests.

## Acknowledgements
* Icon used by this extension - [source](https://www.flaticon.com/free-icon/stitching_3460012?term=stitch&page=2&position=70&page=2&position=70&related_id=3460012&origin=search)

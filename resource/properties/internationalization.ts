// ===================== ImportCer =====================

// Title
EN.set('uploadProduct.importCer.title', 'Upload Product');

// Labels
EN.set('uploadProduct.importCer.label.p12FileName', 'Key store name (*.p12):');
EN.set('uploadProduct.importCer.label.savePath', 'Select file save path:');
EN.set('uploadProduct.importCer.label.keyStorePassword', 'Key store password:');
EN.set('uploadProduct.importCer.label.confirmPassword', 'Confirm password:');
EN.set('uploadProduct.importCer.label.keyAlias', 'Alias:');
EN.set('uploadProduct.importCer.advanceSetting', 'Advance Setting');
EN.set('uploadProduct.importCer.label.csrFile', 'CSR file (*.csr):');
EN.set('uploadProduct.importCer.label.csrSavePath', 'Select file save path:');
EN.set('uploadProduct.importCer.label.fileWillBeCreatedIn', 'File will be create in');
EN.set('uploadProduct.importCer.label.validity', 'Validity(years):');
EN.set('uploadProduct.importCer.label.firstName', 'First and last name:');
EN.set('uploadProduct.importCer.label.orgUnit', 'Organizational unit:');
EN.set('uploadProduct.importCer.label.organization', 'Organization:');
EN.set('uploadProduct.importCer.label.city', 'City or locality:');
EN.set('uploadProduct.importCer.label.province', 'State or province:');
EN.set('uploadProduct.importCer.label.countryCode', 'Country code(XX):');

// Placeholder
EN.set('uploadProduct.importCer.placeholder.p12Name', 'Enter .p12 file name');
EN.set('uploadProduct.importCer.placeholder.password', 'Enter store password');
EN.set('uploadProduct.importCer.placeholder.alias', 'Enter key alias');

// Errors
EN.set('uploadProduct.importCer.error.p12Format', 'Only .p12 file is allowed');
EN.set('uploadProduct.importCer.error.csrFormat', 'Only .csr file is allowed');
EN.set('uploadProduct.importCer.error.p12NameRequired', 'Key store name is required');
EN.set('uploadProduct.importCer.error.p12NameFormat', 'Only letters, numbers, -, _, and .p12 ending allowed');
EN.set('uploadProduct.importCer.error.p12PathRequired', 'Please select .p12 file');
EN.set('uploadProduct.importCer.error.passwordRequired', 'Password is required');
EN.set('uploadProduct.importCer.error.passwordMinLength', 'Password must be at least 6 characters');
EN.set('uploadProduct.importCer.error.confirmPasswordRequired', 'Please confirm your password');
EN.set('uploadProduct.importCer.error.passwordMismatch', 'Passwords do not match');
EN.set('uploadProduct.importCer.error.keyAliasRequired', 'Alias is required');
EN.set('uploadProduct.importCer.error.keyAliasNoSpace', 'Alias cannot contain spaces');
EN.set('uploadProduct.importCer.error.validityRequired', 'Validity is required');
EN.set('uploadProduct.importCer.error.validityFormat', 'Validity must be a positive integer');
EN.set('uploadProduct.importCer.error.firstNameRequired', 'First and last name is required');
EN.set('uploadProduct.importCer.error.orgUnitRequired', 'Organizational unit is required');
EN.set('uploadProduct.importCer.error.organizationRequired', 'Organization is required');
EN.set('uploadProduct.importCer.error.cityRequired', 'City or locality is required');
EN.set('uploadProduct.importCer.error.provinceRequired', 'State or province is required');
EN.set('uploadProduct.importCer.error.countryCodeRequired', 'Country code is required');
EN.set('uploadProduct.importCer.error.countryCodeFormat', 'Country code must be 2 uppercase letters');
EN.set('uploadProduct.importCer.error.csrNameRequired', 'Please select .csr file');
EN.set('uploadProduct.importCer.error.csrPathRequired', 'Please select .csr file');
EN.set('uploadProduct.importCer.error.invalidPath', 'Invalid file path');
EN.set('uploadProduct.importCer.error.uploadFailed', 'Upload failed');

// Help
EN.set('uploadProduct.importCer.help.title', 'Help');
EN.set(
    'uploadProduct.importCer.help.content',
    'Fill in the required information to import a certificate for app signing.',
);
EN.set('uploadProduct.importCer.help.p12Name.title', 'Key Store Name');
EN.set(
    'uploadProduct.importCer.help.p12Name.content',
    'P12 file contains both private key and certificate. Name must end with .p12 and contain only letters, numbers, -, and _.',
);
EN.set('uploadProduct.importCer.help.keyAlias.title', 'Alias');
EN.set(
    'uploadProduct.importCer.help.keyAlias.content',
    'Alias is a unique identifier for the key entry within the keystore. It is used to reference the specific signing key.',
);
EN.set('uploadProduct.importCer.help.csrFile.title', 'CSR File');
EN.set(
    'uploadProduct.importCer.help.csrFile.content',
    'CSR file is used to request a certificate from a Certificate Authority (CA).',
);
EN.set('uploadProduct.importCer.help.firstName.title', 'First and Last Name');
EN.set(
    'uploadProduct.importCer.help.firstName.content',
    'The common name (CN) for the certificate, typically your full name or company name.',
);
EN.set('uploadProduct.importCer.help.orgUnit.title', 'Organizational Unit');
EN.set(
    'uploadProduct.importCer.help.orgUnit.content',
    'The department or division within your organization (e.g., Engineering, Marketing).',
);
EN.set('uploadProduct.importCer.help.organization.title', 'Organization');
EN.set(
    'uploadProduct.importCer.help.organization.content',
    'The legal name of your organization or company.',
);
EN.set('uploadProduct.importCer.help.city.title', 'City or Locality');
EN.set(
    'uploadProduct.importCer.help.city.content',
    'The city or locality where your organization is legally registered.',
);
EN.set('uploadProduct.importCer.help.province.title', 'State or Province');
EN.set(
    'uploadProduct.importCer.help.province.content',
    'The state or province where your organization is legally registered.',
);

// Buttons
EN.set('uploadProduct.importCer.button.cancel', 'Cancel');
EN.set('uploadProduct.importCer.button.next', 'Next');

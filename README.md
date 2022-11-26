# Todo

## Important

### Remove all unnecessary files and clean up the repository (Pontus)

### Add explanations for how to use the tool (Pontus + Markus)

### Remove the extractNested stuff from listQuery when generating. Also remove the array thing from writeResolverWithoutArgs. (Markus)

### Add additional checks for concatenation in resolver functions (Markus)

### Fix path traversal so it aligns with Section 3.2 (Pontus)

## Not as important

### Remove wrappedTypes (Markus)

### Add checks before overwriting files during schema generation (check if file exists) (Markus/Pontus)

### Remove redundant parameters in concatenate resolver functions (Markus) (done?)

## Done

### Fix includeAllFields validation so it meets new requirements. 

### Add proper error messages to everything, both validation and generation errors - done

### Add generation steps for object and interface types that have enabled includeAllFields - done

### Fix traversePath in the validation algorithm - done

### Implement/finish wrap validation for field definitions - done

### Add functionality for concatenate on types wrapping an interface (wrappedFaculty for example) - done

### Change concatenate validation. If object type is not wrapped, then return false - done

### Revamp concatenate validation. - done

### Add typesImplementingInterface to resolver without arguments - done

### Implement/finish wrap validation conditions 3, 4, 6, 7 - done

### Change concatenate resolver generation, the if-else part should be present for simple strings (not only for delegated fields) - done



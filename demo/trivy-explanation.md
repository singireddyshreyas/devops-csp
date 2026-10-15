# Trivy scan explanation

Trivy scans the SupportDesk backend and frontend container images for known
operating-system and language-package vulnerabilities. The GitHub Actions gate
checks HIGH and CRITICAL findings with an available upstream fix and fails the
build when one is found; unfixed findings remain visible for review but cannot
be remediated by the project until the base image or package publisher releases
a fix.

The local rebuilt images were scanned with the same HIGH/CRITICAL and
`ignore-unfixed` policy and produced zero blocking findings for both images.

.PHONY: all

# Build through Corepack rather than a bare `npm`. package.json pins npm via
# "packageManager", and Corepack provisions that exact version; a system npm
# below the engines floor would otherwise fail the install outright, because
# .npmrc sets engine-strict=true.
all:
	corepack npm run package

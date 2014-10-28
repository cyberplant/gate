#!/bin/sh -x

revhash=$(git rev-parse --short HEAD)
revcount=$(git rev-list --count HEAD)

version=$(dpkg-parsechangelog --count 1 |grep 'Version:'|awk '{print $2}')-r${revcount}-${revhash}

debchange -m -D unstable --force-distribution -v $version "Automatic build"

debuild --no-lintian -us -uc -b
cd ..
mkdir -p deploy
mv gate_* deploy
cd deploy
dpkg-scanpackages . /dev/null > Packages
bzip2 -kf Packages
cd ..

ncftpput -R -v -u "$$FTPUSER" -p "$$FTPPASS" packages.roji.net packages.roji.net/ deploy/*

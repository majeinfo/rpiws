# rpiws
#
This software is an interface with ZWaveAPI from Zwave.me.
It uses Node.JS and can be installed on any Linux or Raspberry PI.
It assumes the Administrator account and password for the ZWaveAPI interface (listining on port 8083) are admin/admin.

Once you copied the files from GIT repository, run "npm install" to install Node.JS required modules.
Then copy config/local.tpl.js into config/local.js and change the hostname value with the IP address of
the Raspberry Pi device if needed


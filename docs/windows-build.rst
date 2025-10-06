.. _windows_build:

Windows build guide
===================

This guide explains how to build rotki from source on Windows 10 or Windows 11.
It covers the required dependencies, recommended installation methods, and the
steps to produce a working development build of the application.

.. note::

   All commands in this document are meant to be executed from a
   ``PowerShell`` terminal that has been opened with standard (non-admin)
   privileges unless explicitly stated otherwise.

Prerequisites
-------------

Hardware and operating system
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

* Windows 10 or Windows 11 (64 bit).
* At least 16 GB of RAM is recommended when building both the Python backend
  and the Vue frontend simultaneously.

Required software
~~~~~~~~~~~~~~~~~

The project uses a multi-language toolchain. The table below lists the minimum
supported versions when building on Windows. Newer versions are expected to
work as well.

=============================== ===================== =======================
Tool                            Minimum version       Notes
=============================== ===================== =======================
`Git <https://git-scm.com/>`_   2.44                  Required to clone the repository.
`Node.js <https://nodejs.org/>`_ 22.0                 Needed for the Vue frontend.
`pnpm <https://pnpm.io/>`_      10.0                  JavaScript package manager.
`Python <https://www.python.org/>`_ 3.11             Backend language runtime.
`uv <https://docs.astral.sh/uv/>`_ 0.4               Python project manager used for virtual environments.
`Rust toolchain <https://www.rust-lang.org/tools/install>`_ Stable channel   Required for the Colibri service.
`Visual Studio Build Tools <https://learn.microsoft.com/visualstudio/install/install-visual-studio>`_ 2022 build tools + "Desktop development with C++" workload Required to compile native Python/Rust dependencies.
=============================== ===================== =======================

Optional but recommended
~~~~~~~~~~~~~~~~~~~~~~~~

* `Windows Terminal <https://learn.microsoft.com/windows/terminal/>`_ for an
  improved shell experience.
* `winget <https://learn.microsoft.com/windows/package-manager/winget/>`_ to
  automate dependency installation. Most modern Windows editions have it
  preinstalled.

Automated dependency setup
--------------------------

The repository ships with helper scripts under ``tools/windows`` that can
verify the dependency chain and install missing components via ``winget``.
Both scripts can be inspected and customised before running them.

#. Open ``PowerShell`` and clone the repository if you have not already done so::

       git clone https://github.com/rotki/rotki.git
       cd rotki

#. Run the dependency checker/installer. The script will attempt to install
   any missing tools using ``winget`` and will warn you if manual steps are
   required (for example Visual Studio Build Tools)::

       powershell -ExecutionPolicy Bypass -File tools/windows/setup-deps.ps1

   You can pass ``-InstallBuildTools`` to automate the Visual Studio Build
   Tools installation. The installation takes a while and requires elevated
   permissions::

       powershell -ExecutionPolicy Bypass -File tools/windows/setup-deps.ps1 -InstallBuildTools -Elevate

   The ``-Elevate`` switch relaunches the script with administrative rights
   because Visual Studio Build Tools need elevation.

#. Once dependencies are installed, configure the project-specific
   environments (JavaScript packages and Python virtual environment)::

       powershell -ExecutionPolicy Bypass -File tools/windows/prepare-environment.ps1

Manual installation alternatives
--------------------------------

If you prefer to install dependencies manually, follow the steps below.
These should be completed before attempting to build rotki.

1. Install Git by downloading the official installer from the Git website.
2. Install Node.js 22.x from the official installer. During the installation
   enable the option that adds Node.js to the ``PATH`` environment variable.
3. Install pnpm using ``winget install --id pnpm.pnpm`` or by running
   ``npm install -g pnpm`` after Node.js is available.
4. Install Python 3.11 from the Microsoft Store or the official installer.
   Make sure to enable the "Add python.exe to PATH" option.
5. Install ``uv`` either via ``winget install --id Astral.UV`` or by running
   ``pip install --user uv``.
6. Install the Rust toolchain by running ``winget install --id Rustlang.Rustup``
   or downloading ``rustup-init.exe`` from the official website. After
   installation run ``rustup default stable`` to ensure you are on the stable
   channel.
7. Install Visual Studio 2022 Build Tools with the "Desktop development with
   C++" workload. This provides the MSVC compiler and Windows SDK that Rust and
   Python packages with native extensions rely on. The installation can be
   automated with::

       winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --quiet --wait"

Fetching the source code
------------------------

Use Git to clone the repository and switch into its directory::

    git clone https://github.com/rotki/rotki.git
    cd rotki

If you plan to contribute back, fork the repository first and clone your fork.

Bootstrapping the development environment
-----------------------------------------

After all dependencies are installed, initialise the project dependencies.
The PowerShell helper script ``tools/windows/prepare-environment.ps1`` runs the
necessary commands for you, but the steps are listed here explicitly.

1. Install frontend packages::

       pnpm install

2. Create and synchronise the Python environment using ``uv``::

       uv sync

3. (Optional) Verify the Rust toolchain::

       rustup show active-toolchain
       cargo --version

Running the development servers
-------------------------------

Once dependencies are installed and the environment is prepared you can launch
both the backend and the frontend.

1. Start the backend API and WebSocket server::

       uv run python -m rotkehlchen --api-port 4242 --websockets-port 4333

2. In a new ``PowerShell`` window, start the frontend development server from
   the ``frontend`` directory::

       cd frontend
       pnpm dev

The application will open in Electron by default. You can also run the web-only
frontend using ``pnpm dev:web``.

Building distributable artifacts
--------------------------------

To build a production version of the frontend run::

    cd frontend
    pnpm build

For packaging the desktop application, ensure all platform-specific
requirements are installed (including ``electron-builder`` dependencies) and
run::

    cd ..
    python package.py

Running automated tests
-----------------------

Backend tests should always be executed through the provided test wrapper to
ensure gevent is initialised correctly::

    uv run python pytestgeventwrapper.py

Frontend unit tests run via pnpm::

    cd frontend
    pnpm test:unit

Troubleshooting
---------------

* If ``winget`` is not installed, install the Windows App Installer from the
  Microsoft Store and rerun the dependency script.
* If pnpm cannot find the Python executable, ensure that ``python.exe`` is on
  your ``PATH`` and restart the shell.
* If Rust compilation fails complaining about the MSVC toolchain, open the
  "x64 Native Tools Command Prompt for VS 2022", run ``rustup default stable``
  again, and retry the build.
* When ``uv`` fails to build a Python package because of missing build tools,
  confirm that the "Desktop development with C++" workload was installed and
  reboot Windows after installing Visual Studio Build Tools.


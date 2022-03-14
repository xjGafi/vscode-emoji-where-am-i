import path from 'path'
import { ConfigurationTarget, workspace, StatusBarAlignment, TextEditor, window, commands, ExtensionContext, Disposable } from 'vscode'

type ProjectSetting = Record<string, {
  emoji?: string
}>

function getProjectPath(): string | undefined {
  if (Array.isArray(workspace.workspaceFolders)) {
    if (workspace.workspaceFolders.length === 1) {
      return workspace.workspaceFolders[0].uri.path
    }
    else if (workspace.workspaceFolders.length > 1) {
      const activeTextEditor: TextEditor | undefined = window.activeTextEditor
      if (activeTextEditor) {
        const workspaceFolder = workspace.workspaceFolders.find(folder =>
          activeTextEditor.document.uri.path.startsWith(folder.uri.path),
        )
        if (workspaceFolder)
          return workspaceFolder.uri.path
      }
    }
  }
}

function getProjectName(projectPath: string) {
  const projectName = path.basename(projectPath)
  return projectName
}

function getEmoji(): string {
  return workspace.getConfiguration('emoji-where-am-i').get('emoji') as string
}

function getProjectSetting(): ProjectSetting {
  return workspace.getConfiguration('emoji-where-am-i').get('projectSetting') as ProjectSetting
}

function setProjectSetting(v: ProjectSetting) {
  workspace.getConfiguration('emoji-where-am-i').update('projectSetting', v, ConfigurationTarget.Global)
}

export function activate(context: ExtensionContext) {
  let onDidChangeWorkspaceFoldersDisposable: Disposable | undefined
  let onDidChangeActiveTextEditorDisposable: Disposable | undefined
  const statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 100000)
  let projectPath: string | undefined
  let projectEmoji: string |undefined
  let projectName = ''

  function updateStatusBarItem() {
    projectPath = getProjectPath()
    if (!projectPath) {
      statusBarItem.text = ''
      statusBarItem.hide()
      return
    }

    const projectSetting = getProjectSetting()[projectPath]
    projectName = `${projectSetting?.emoji || getEmoji()} ${getProjectName(projectPath)}`

    statusBarItem.text = projectName
    statusBarItem.command = 'workbench.action.quickSwitchWindow'
    statusBarItem.show()
  }

  function updateSubscription() {
    if (!onDidChangeWorkspaceFoldersDisposable) {
      (onDidChangeWorkspaceFoldersDisposable = workspace.onDidChangeWorkspaceFolders(() => {
        updateSubscription()
        updateStatusBarItem()
      }))
    }

    if (Array.isArray(workspace.workspaceFolders)) {
      if (workspace.workspaceFolders.length > 1) {
        if (!onDidChangeActiveTextEditorDisposable)
          onDidChangeActiveTextEditorDisposable = window.onDidChangeActiveTextEditor(() => updateStatusBarItem())
      }
      else {
        if (onDidChangeActiveTextEditorDisposable)
          onDidChangeActiveTextEditorDisposable.dispose()
      }
    }
  }

  context.subscriptions.push(statusBarItem)

  commands.registerCommand('emoji-where-am-i.config', async() => {
    if (!projectName || !projectPath)
      return

    if (getEmoji()) {
      projectEmoji = await window.showInputBox({
        value: projectEmoji,
        prompt: 'Project Emoji',
      }) ?? projectEmoji
    }

    const settings = getProjectSetting()
    if (!settings[projectPath])
      settings[projectPath] = {}

    settings[projectPath].emoji = projectEmoji

    setProjectSetting(settings)

    updateStatusBarItem()
  })

  workspace.onDidChangeConfiguration(() => {
    updateSubscription()
    updateStatusBarItem()
  })

  updateSubscription()
  updateStatusBarItem()
}

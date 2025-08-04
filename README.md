# Todo.txt for Obsidian

> Powerful yet simple task management for [Obsidian](https://obsidian.md/) in the portable [Todo.txt](http://todotxt.org/) format, with smart filtering and a modern interface.


## ✨ Features

### 📋 **Smart Task Management**
- **Todo.txt format** - Simple, portable, future-proof
- **Quick filters** - All, Today, Upcoming, Inbox, Archived, Completed
- **Flexible sorting** - By priority, due date, creation date, alphabetical, projects, or contexts
- **Project organization** - Custom icons, pinning, bulk operations
- **Priority levels** - Visual priority indicators (A, B, C)
- **Due dates** - Smart date recognition with status indicators
- **Recurring tasks** - Flexible recurrence patterns
- **Context tags** - Organize by location, energy, or focus
- **Task notes** - Extended descriptions with link support

### 🚀 **Modern Interface**
- **Mobile responsive** - Full functionality on all devices
- **Theme compatible** - Works seamlessly with all Obsidian themes
- **Instant search** - Find tasks across all projects
- **Smart suggestions** - Autocomplete for projects, contexts, and priorities
- **Keyboard shortcuts** - `Alt+N` to add tasks, `/` for quick commands
- **Bulk operations** - Manage multiple completed tasks at once

### ⚡ **Quick Input**
Type `/` for quick commands:
- `/Date` - Set due dates (Today, Tomorrow, Next Week, etc.)
- `/Priority` - Set priority levels
- `/Project` - Assign to projects  
- `/Context` - Add context tags

Use shortcuts: `@context` `+project` `!priority` `*date`

### ⌨️ **Keyboard Shortcuts**

| Shortcut | Action |
|----------|--------|
| `Alt+N` | Add new task |
| `/` | Open command menu |
| `@` | Insert context |
| `+` | Assign project |
| `*` | Set due date |
| `!` | Set priority |
| `Enter` | Save task |
| `Esc` | Close dialog |

## 🔧 Installation

### From Obsidian Community Plugins
1. Open Settings → Community plugins
2. Browse and search for "Todo.txt"
3. Install and enable the plugin

### Manual Installation
1. Download the latest release from [GitHub](https://github.com/SearchMahmudul/obsidian-todo-txt/releases)
2. Extract to `{VaultFolder}/.obsidian/plugins/todo-txt/`
3. Reload Obsidian and enable the plugin

## 📖 Usage

### Getting Started
1. Open the plugin via ribbon icon or `Ctrl/Cmd+P` → "Open Todo.txt"
2. Create your first task by clicking "Add task" or pressing `Alt+N`
3. Organize with projects, set priorities, and add due dates

### Todo.txt Format
```txt
(A) 2025-08-03 @Features Add due date in Todo.txt +Inbox due:2025-06-25
(B) 2025-08-03 Solve Python #problems rec:1m,3 +Coding due:2025-08-03
(C) 2025-08-03 Buy groceries from https://example.com +Shop ||Get essentials like milk, eggs, bread, and vegetables.
2025-08-03 Read Chapter 4 of the physics textbook time:2h +Study due:2025-08-18
```

**Format breakdown:**
- `(A)` - Priority (A=High, B=Medium, C=Low)
- `2025-08-03` - Creation date
- `@Features` - Context tag
- `#problems` - Hashtag (searchable)
- `+Inbox` - Project tag
- `due:2025-06-25` - Due date
- `rec:1m,3` - Monthly recurrence on 3rd
- `time:2h` - Custom key:value pairs
- `https://example.com` - Clickable links
- `||Get essentials...` - Task notes

### Recurring Tasks
Support for flexible recurrence patterns:
- `rec:1d` - Daily
- `rec:1w` - Weekly  
- `rec:1m` - Monthly
- `rec:1y` - Yearly
- `rec:1w,sun,mon,fri` - Weekly on specific days
- `rec:1m,12,17` - Monthly on specific dates (12th and 17th)
- `rec:jun,23` - Yearly on specific date (June 23rd)

### Project Management
- **Create projects** - Click + next to "Projects"
- **Add icons** - Emoji or SVG icons for visual organization
- **Pin important** - Right-click → Pin for quick access
- **Bulk actions** - Rename, delete, or archive entire projects

### Smart Filtering & Sorting
- **All** - View all active tasks
- **Today** - Due today or overdue
- **Upcoming** - Future due dates
- **Inbox** - Unorganized tasks
- **Archived** - Archived tasks
- **Completed** - Finished tasks

**Sort options:** Priority, Due Date, Creation Date, Alphabetical, Projects, Contexts, Completion Date

## ⚙️ Configuration

### Settings
- **Tasks location** - Choose your todo.txt file path
- **Startup filter** - Default view when opening
- **Open on startup** - Auto-open when Obsidian starts

## 🎯 Pro Tips

- Use `Alt+N` anywhere in Obsidian to quickly add tasks
- Search with hashtags: `#meeting` finds all meeting-related tasks
- Set up projects for different areas: `+Work`, `+Personal`, `+Learning`
- Use contexts for energy levels: `@high-energy`, `@low-energy`
- Combine filters: Search while in a project view to find specific tasks
- Sort by due date to prioritize urgent tasks, or by project to batch similar work

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the [Obsidian](https://obsidian.md/) community
- Inspired by the [Todo.txt](http://todotxt.org/) format by Gina Trapani
- Icons from [Lucide](https://lucide.dev/)

---

⭐ **Star this repo** if you find it helpful!
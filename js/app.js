/**
 * Jihad - Hub de Resumos (AWS Academy Cloud Developing & React Frontend)
 * Gerencia a Página Inicial do Hub (retângulos de trilhas), a Barra Superior,
 * o carregamento dinâmico por módulo, suporte a múltiplas trilhas e navegação lateral retrátil.
 */
(function () {
    if (window.__AWS_APP_LOADED__) return;
    window.__AWS_APP_LOADED__ = true;

    function initApp() {
        var hubView = document.getElementById('hub-view');
        var courseView = document.getElementById('course-view');
        var btnBackHub = document.getElementById('btn-back-hub');
        var brandHomeLink = document.getElementById('brand-home-link');
        var topbarCmdPath = document.getElementById('topbar-cmd-path');
        var cardAwsCloud = document.getElementById('card-aws-cloud');
        var cardReact = document.getElementById('card-react');

        var sidebarAws = document.getElementById('sidebar-aws');
        var sidebarReact = document.getElementById('sidebar-react');
        var termPrompt = document.getElementById('term-prompt');

        var contentContainer = document.getElementById('MainContentScroll');
        var moduleContainer = document.getElementById('module-container');
        var moduleBadge = document.getElementById('active-module-badge');
        var currentModuleId = null;

        var TRACKS = {
            aws: {
                name: 'AWS Cloud Developing',
                cmdPrefix: '~/jihad/aws-cloud-dev/',
                termPrompt: 'aws@student:~$ <span>iniciando ambiente modular de resumos... pronto.</span>',
                badgeClass: 'active-module-badge',
                defaultModule: 'modulo-1',
                modules: [
                    'modulo-1', 'modulo-2', 'modulo-3', 'modulo-4', 'modulo-5',
                    'modulo-6', 'modulo-7', 'modulo-8', 'modulo-9', 'modulo-10',
                    'modulo-11', 'modulo-12', 'modulo-13'
                ]
            },
            react: {
                name: 'React Frontend',
                cmdPrefix: '~/jihad/react-dev/',
                termPrompt: 'react@dev:~$ <span>iniciando ambiente Vite/React... pronto.</span>',
                badgeClass: 'active-module-badge badge-react',
                defaultModule: 'react-modulo-1',
                modules: [
                    'react-modulo-1'
                ]
            }
        };

        function getTrackForModule(moduleId) {
            if (!moduleId) return 'aws';
            if (moduleId.indexOf('react') === 0) return 'react';
            return 'aws';
        }

        /**
         * Garante que TODOS os arrows na lateral esquerda iniciem minimizados.
         */
        function collapseAllSidebarArrows() {
            document.querySelectorAll('.sidebar > ul > li.has-submenu').forEach(function (li) {
                li.classList.remove('expanded');
            });
        }

        collapseAllSidebarArrows();

        /**
         * Alterna para a Página Inicial do Hub Jihad (Retângulos no centro)
         */
        function showHubView(updateUrl) {
            if (hubView) hubView.classList.remove('hidden');
            if (courseView) courseView.classList.add('hidden');
            if (btnBackHub) btnBackHub.classList.remove('visible');
            if (topbarCmdPath) {
                topbarCmdPath.textContent = '~/jihad/hub --select-track';
            }
            document.title = 'Jihad — Hub de Resumos';

            if (updateUrl && window.history && window.history.replaceState) {
                window.history.replaceState(null, '', window.location.pathname);
            }
        }

        /**
         * Alterna para a visualização do curso selecionado (AWS ou React)
         */
        function showCourseView(moduleId, targetAnchor, updateUrl) {
            var trackKey = getTrackForModule(moduleId);
            var trackConfig = TRACKS[trackKey];

            if (hubView) hubView.classList.add('hidden');
            if (courseView) courseView.classList.remove('hidden');
            if (btnBackHub) btnBackHub.classList.add('visible');

            if (sidebarAws) {
                sidebarAws.style.display = (trackKey === 'aws') ? 'flex' : 'none';
            }
            if (sidebarReact) {
                sidebarReact.style.display = (trackKey === 'react') ? 'flex' : 'none';
            }

            if (termPrompt) {
                termPrompt.innerHTML = trackConfig.termPrompt;
            }

            document.title = 'Jihad — ' + trackConfig.name;

            var targetMod = moduleId || trackConfig.defaultModule;
            var targetAnc = targetAnchor || ('#' + targetMod);
            return loadModule(targetMod, targetAnc, updateUrl);
        }

        /**
         * Descobre a qual módulo pertence um determinado hash
         */
        function resolveModuleFromHash(hash) {
            if (!hash) return null;
            var cleanHash = hash.replace(/^#/, '');
            if (!cleanHash || cleanHash === 'hub') return null;
            if (cleanHash === 'aws') return 'modulo-1';
            if (cleanHash === 'react') return 'react-modulo-1';

            if (/^react-modulo-\d+$/.test(cleanHash)) {
                return cleanHash;
            }
            if (cleanHash.indexOf('react') === 0) {
                return 'react-modulo-1';
            }

            if (/^modulo-\d+$/.test(cleanHash)) {
                return cleanHash;
            }

            var matchPrefix = cleanHash.match(/^mod(\d+)-/);
            if (matchPrefix) {
                return 'modulo-' + matchPrefix[1];
            }

            var subLink = document.querySelector('.sidebar .sub-menu a[href="#' + cleanHash + '"]');
            if (subLink) {
                var parentLi = subLink.closest('li[data-module]');
                if (parentLi) {
                    return parentLi.getAttribute('data-module');
                }
            }

            return null;
        }

        /**
         * Extrai o HTML e título do módulo a partir de window.MODULES_DATA
         */
        function getModuleEntry(moduleId) {
            if (!window.MODULES_DATA || !window.MODULES_DATA[moduleId]) return null;
            var entry = window.MODULES_DATA[moduleId];
            if (typeof entry === 'string') {
                return { title: moduleId, file: 'modules/' + moduleId + '.html', html: entry };
            }
            return entry;
        }

        /**
         * Busca o HTML do módulo (via fetch quando em servidor HTTP, ou via MODULES_DATA em file://)
         */
        function fetchModuleHtml(moduleId) {
            var modInfo = getModuleEntry(moduleId);
            var filePath;
            if (modInfo && modInfo.file) {
                filePath = modInfo.file;
            } else if (moduleId.indexOf('react-modulo-') === 0) {
                var rNum = moduleId.replace('react-modulo-', '');
                if (rNum.length === 1) rNum = '0' + rNum;
                filePath = 'modules/react-modulo-' + rNum + '.html';
            } else {
                var numStr = moduleId.replace('modulo-', '');
                if (numStr.length === 1) numStr = '0' + numStr;
                filePath = 'modules/modulo-' + numStr + '.html';
            }

            if (window.location.protocol === 'file:' && modInfo && modInfo.html) {
                return Promise.resolve(modInfo.html);
            }

            return fetch(filePath)
                .then(function (response) {
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    return response.text();
                })
                .catch(function () {
                    if (modInfo && modInfo.html) {
                        return modInfo.html;
                    }
                    return '<section><h1>Erro ao carregar módulo</h1><p>Não foi possível carregar o arquivo ' + filePath + '.</p></section>';
                });
        }

        /**
         * Constrói os botões de navegação (Módulo Anterior / Próximo Módulo) no rodapé
         */
        function buildFooterNavigation(moduleId) {
            var trackKey = getTrackForModule(moduleId);
            var moduleList = TRACKS[trackKey].modules;
            var idx = moduleList.indexOf(moduleId);
            if (idx === -1) return '';

            var prevId = idx > 0 ? moduleList[idx - 1] : null;
            var nextId = idx < moduleList.length - 1 ? moduleList[idx + 1] : null;

            var prevEntry = prevId ? getModuleEntry(prevId) : null;
            var nextEntry = nextId ? getModuleEntry(nextId) : null;

            var html = '<div class="module-nav-footer">';

            if (prevId && prevEntry) {
                html += '<a href="#' + prevId + '" class="module-nav-btn prev" data-nav-module="' + prevId + '">' +
                    '<span class="nav-label">&larr; Módulo Anterior</span>' +
                    '<span class="nav-title">' + prevEntry.title + '</span>' +
                    '</a>';
            } else {
                html += '<div></div>';
            }

            if (nextId && nextEntry) {
                html += '<a href="#' + nextId + '" class="module-nav-btn next" data-nav-module="' + nextId + '">' +
                    '<span class="nav-label">Próximo Módulo &rarr;</span>' +
                    '<span class="nav-title">' + nextEntry.title + '</span>' +
                    '</a>';
            }

            html += '</div>';
            return html;
        }

        /**
         * Atualiza o estado visual de destaque na barra lateral e no breadcrumb da Top Bar
         */
        function updateSidebarHighlight(moduleId, activeAnchor) {
            var trackKey = getTrackForModule(moduleId);
            var trackConfig = TRACKS[trackKey];

            if (sidebarAws) {
                sidebarAws.style.display = (trackKey === 'aws') ? 'flex' : 'none';
            }
            if (sidebarReact) {
                sidebarReact.style.display = (trackKey === 'react') ? 'flex' : 'none';
            }

            document.querySelectorAll('.sidebar > ul > li').forEach(function (li) {
                if (li.getAttribute('data-module') === moduleId) {
                    li.classList.add('active-module');
                } else {
                    li.classList.remove('active-module');
                }
            });

            document.querySelectorAll('.sidebar .sub-menu a').forEach(function (a) {
                if (activeAnchor && a.getAttribute('href') === activeAnchor) {
                    a.classList.add('active');
                } else {
                    a.classList.remove('active');
                }
            });

            var entry = getModuleEntry(moduleId);
            if (moduleBadge && entry && entry.title) {
                moduleBadge.textContent = entry.title;
                moduleBadge.className = trackConfig.badgeClass;
            }
            if (topbarCmdPath && entry && entry.title) {
                topbarCmdPath.textContent = trackConfig.cmdPrefix + moduleId;
            }
            if (termPrompt) {
                termPrompt.innerHTML = trackConfig.termPrompt;
            }
        }

        /**
         * Rola até uma sub-seção específica ou para o topo do módulo
         */
        function scrollToTarget(targetAnchor) {
            if (!targetAnchor || targetAnchor === '#' + currentModuleId) {
                if (contentContainer) {
                    contentContainer.scrollTo({ top: 0, behavior: 'smooth' });
                }
                return;
            }

            var targetEl = document.querySelector(targetAnchor);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        /**
         * Resolve imagens caso o navegador esteja rodando em sandbox XDG Portal (/run/user/1000/doc/...)
         */
        function resolvePortalImages(container) {
            if (!window.PORTAL_IMG_FALLBACK) return;
            var isPortal = window.location.pathname.indexOf('/run/user/') !== -1 || window.location.protocol === 'file:';
            if (!isPortal) return;

            container.querySelectorAll('img').forEach(function (img) {
                var rawSrc = img.getAttribute('src');
                if (rawSrc && window.PORTAL_IMG_FALLBACK[rawSrc]) {
                    if (window.location.pathname.indexOf('/run/user/') !== -1) {
                        img.src = window.PORTAL_IMG_FALLBACK[rawSrc];
                    } else {
                        img.addEventListener('error', function onImgErr() {
                            img.removeEventListener('error', onImgErr);
                            img.src = window.PORTAL_IMG_FALLBACK[rawSrc];
                        });
                    }
                }
            });
        }

        /**
         * Carrega e exibe um módulo específico na área principal
         */
        function loadModule(moduleId, targetAnchor, updateUrl) {
            if (currentModuleId === moduleId && moduleContainer.innerHTML.trim() !== '') {
                updateSidebarHighlight(moduleId, targetAnchor);
                scrollToTarget(targetAnchor);
                if (updateUrl && window.history && window.history.replaceState) {
                    window.history.replaceState(null, '', targetAnchor || ('#' + moduleId));
                }
                return Promise.resolve();
            }

            return fetchModuleHtml(moduleId).then(function (html) {
                currentModuleId = moduleId;
                moduleContainer.innerHTML = html + buildFooterNavigation(moduleId);
                resolvePortalImages(moduleContainer);
                updateSidebarHighlight(moduleId, targetAnchor);

                // Eventos dos botões de rodapé (Anterior / Próximo)
                moduleContainer.querySelectorAll('[data-nav-module]').forEach(function (btn) {
                    btn.addEventListener('click', function (e) {
                        e.preventDefault();
                        var targetMod = btn.getAttribute('data-nav-module');
                        loadModule(targetMod, '#' + targetMod, true);
                    });
                });

                if (targetAnchor && targetAnchor !== '#' + moduleId) {
                    setTimeout(function () {
                        scrollToTarget(targetAnchor);
                    }, 40);
                } else if (contentContainer) {
                    contentContainer.scrollTo({ top: 0, behavior: 'instant' });
                }

                if (updateUrl && window.history && window.history.replaceState) {
                    window.history.replaceState(null, '', targetAnchor || ('#' + moduleId));
                }
            });
        }

        /**
         * Eventos do Hub Jihad (Barra Superior + Cards das Trilhas)
         */
        if (cardAwsCloud) {
            cardAwsCloud.addEventListener('click', function (e) {
                e.preventDefault();
                collapseAllSidebarArrows();
                showCourseView('modulo-1', '#modulo-1', true);
            });
        }

        if (cardReact) {
            cardReact.addEventListener('click', function (e) {
                e.preventDefault();
                collapseAllSidebarArrows();
                showCourseView('react-modulo-1', '#react-modulo-1', true);
            });
        }

        if (btnBackHub) {
            btnBackHub.addEventListener('click', function (e) {
                e.preventDefault();
                showHubView(true);
            });
        }

        if (brandHomeLink) {
            brandHomeLink.addEventListener('click', function (e) {
                e.preventDefault();
                showHubView(true);
            });
        }

        /**
         * Cliques nos módulos com sub-menu (Lateral Esquerda)
         * Os arrows iniciam minimizados e só expandem quando o usuário clica.
         */
        document.querySelectorAll('.sidebar > ul > li.has-submenu').forEach(function (li) {
            var moduleLink = li.querySelector(':scope > a');
            var arrowEl = li.querySelector(':scope > a .module-arrow');
            var moduleId = li.getAttribute('data-module');

            if (!moduleLink || !moduleId) return;

            // Se o usuário clicar especificamente na setinha (arrow), alterna apenas minimizar/maximizar
            if (arrowEl) {
                arrowEl.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    li.classList.toggle('expanded');
                });
            }

            // Clique no título do módulo: maximiza/minimiza as sessões e exibe o módulo na tela
            moduleLink.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                var isExpanded = li.classList.contains('expanded');
                var isCurrent = (currentModuleId === moduleId);

                if (!isCurrent) {
                    li.classList.add('expanded');
                    loadModule(moduleId, '#' + moduleId, true);
                } else {
                    if (isExpanded) {
                        li.classList.remove('expanded');
                    } else {
                        li.classList.add('expanded');
                        scrollToTarget('#' + moduleId);
                    }
                }
            });
        });

        /**
         * Cliques nas sub-sessões dentro de um módulo
         */
        document.querySelectorAll('.sidebar .sub-menu a').forEach(function (subLink) {
            subLink.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                var href = subLink.getAttribute('href');
                var parentLi = subLink.closest('li[data-module]');
                if (!parentLi || !href) return;

                var moduleId = parentLi.getAttribute('data-module');
                parentLi.classList.add('expanded');

                loadModule(moduleId, href, true);
            });
        });

        /**
         * Cliques nos módulos sem sub-menu
         */
        document.querySelectorAll('.sidebar > ul > li:not(.has-submenu)').forEach(function (li) {
            var link = li.querySelector(':scope > a');
            var moduleId = li.getAttribute('data-module');
            if (!link || !moduleId) return;

            link.addEventListener('click', function (e) {
                e.preventDefault();
                loadModule(moduleId, '#' + moduleId, true);
            });
        });

        /**
         * Inicialização:
         * - Se houver hash de módulo na URL, abre direto a trilha e o módulo correspondente.
         * - Caso contrário, inicia na Página Inicial do Hub Jihad.
         */
        var initialHash = window.location.hash;
        var initialModule = resolveModuleFromHash(initialHash);
        if (initialModule) {
            showCourseView(initialModule, initialHash || ('#' + initialModule), false);
        } else {
            showHubView(false);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
})();
